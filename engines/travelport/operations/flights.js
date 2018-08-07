require('../../../utils/extentions/string');

const clone = require('clone'),
    currency = require('../../../utils/scbsCurrency'),
    customTax = require('../../../utils/scbsCustomTax'),
    scbsKit = require('../../../utils/scbsKit'),
    tokenCrypt = require('../../../core/tokenCrypt'),
    xmljs = require('libxmljs');

const endpoint = 'AirService';
const sipTimezone = '0300'; // GMT +3 для костыля с перелетами SIP

var engine;
var TravelportFlights = function (operationEngine) {
    engine = operationEngine;
};

TravelportFlights.prototype.execute = function (context, parameters, profileConfig) {
    return getFlights(profileConfig, parameters)
        .then((flightsList) => {
            return flightsList;
        })
        .catch((err) => {
            throw err; // далее эта ошибка обработается в routes.js
        });
};

var getFlights = function (profileConfig, parameters) {
    let xmlBody = buildFlightsRequest(parameters, profileConfig);
    let xmlRequest = engine.wrapRequest(xmlBody, profileConfig);
    return engine.request(xmlRequest, parseFlightsResponse, profileConfig, parameters, endpoint);
};

var buildFlightsRequest = function (parameters, profileConfig) {
    let xmlRequestDocument = new xmljs.Document(),
        cursor = xmlRequestDocument.node('air:LowFareSearchReq').attr({SolutionResult: true});

    parameters.route.map(function (leg) {
        let legDate = leg.date.split('T')[0];

        cursor = cursor
            .node('air:SearchAirLeg')
            .node('air:SearchOrigin')
            .node('com:CityOrAirport').attr({Code: leg.locationBegin.code})
            .parent() // city
            .parent() // search orig
            .node('air:SearchDestination')
            .node('com:CityOrAirport').attr({Code: leg.locationEnd.code})
            .parent() // city
            .parent() // search dest
            .node('air:SearchDepTime').attr({PreferredTime: legDate})
            .parent() // searc time
            .node('air:AirLegModifiers')
            .node('air:PermittedCabins')
            .node('com:CabinClass')
            .attr({Type: parameters.serviceClass.toLowerCase().capitalize()})
            .parent() // cabin class
            .parent() // parm cabin
            .node('air:FlightType').attr({
                NonStopDirects: (parameters.skipConnected === true || parameters.skipConnected === "true")
            }).parent() // flighttype
            .parent() // modif
            .parent(); // searchairleg
    });

    cursor = cursor
        .node('air:AirSearchModifiers')
        .node('air:PreferredProviders')
        .node('com:Provider').attr({Code: '1G'})
        .parent()
        .parent();

    if (parameters.preferredAirlines instanceof Array && parameters.preferredAirlines.length > 0) {
        cursor = cursor
            .node('air:PermittedCarriers');
        for (i = 0; i < parameters.preferredAirlines.length; i++) {
            if (profileConfig.denyAirlines.indexOf(parameters.preferredAirlines[i]) === -1) {
                cursor = cursor
                    .node('com:Carrier').attr({Code: parameters.preferredAirlines[i].code})
                    .parent();
            }
        }
        cursor = cursor.parent();
    } else if (profileConfig.denyAirlines.length > 0) {
        cursor = cursor.node('air:ProhibitedCarriers');
        profileConfig.denyAirlines.map(function (carrier) {
            cursor = cursor.node('com:Carrier').attr({Code: carrier}).parent();
        });
        cursor = cursor.parent();
    }

    cursor = cursor.parent();

    parameters.seats.map(function (seat) {
        cursor = cursor.node('com:SearchPassenger').attr({Code: engine.passengerClass[seat.passengerType]});

        switch (seat.passengerType) {
            case 'CHILD':
                cursor = cursor.attr({Age: 7});
                break;
            case 'YOUTH':
                cursor = cursor.attr({Age: 20});
                break;
            case 'SENIOR':
                cursor = cursor.attr({Age: 70});
                break;
            case 'INFANT':
                cursor = cursor.attr({Age: 1});
        }
        cursor = cursor.parent();
    });

    cursor = cursor.node('air:AirPricingModifiers').attr({
        ETicketability: 'Required'
    }).parent();

    return xmlRequestDocument;
};

var parseFlightsResponse = function (xmlDoc, profileConfig, parameters) {
    let priceNotFlights = (xmlDoc.find('//air:AirPriceRsp', engine.nsUri).length !== 0),
        airs = xmlDoc.find('//air:AirPricingSolution', engine.nsUri),
        solutions = [],
        responseCurrency = getResponseCurrency(xmlDoc);

    // проход по всем ценовым решениям (у галлилео это отдельно)
    airs.map(function (airPricingSolution) {
        let pricingInfos = airPricingSolution.find('air:AirPricingInfo', engine.nsUri),
            journeys = priceNotFlights ? [airPricingSolution] : airPricingSolution.find('air:Journey', engine.nsUri),
            segment = xmlDoc.get("//air:AirSegment[@Key='" +
                journeys[0].get('air:AirSegmentRef', engine.nsUri).attr('Key').value()
                + "']", engine.nsUri),
            pricing = {
                token: {
                    provider: profileConfig.providerSettings.code,
                    pc: engine.getNodeAttr(pricingInfos[0], 'PlatingCarrier'),
                    ps: engine.getNodeAttr(airPricingSolution, 'Key'),
                    pi: pricingInfos.map(function (pricingInfo) {
                        var fareInfos = pricingInfo.get('air:FareInfoRef', engine.nsUri)
                            ? pricingInfo.find('air:FareInfoRef', engine.nsUri).map(function (ref) {
                                return xmlDoc.get("//air:FareInfoList/air:FareInfo[@Key='" + ref.attr('Key').value() + "']", engine.nsUri);
                            })
                            : pricingInfo.find('air:FareInfo', engine.nsUri);

                        return [
                            pricingInfo.attr('Key').value(),
                            pricingInfo.find('air:PassengerType', engine.nsUri).map(function (passengerType) {
                                return passengerType.attr('Code').value();
                            }).join('±'),
                            fareInfos.map(function (fareInfo) {
                                return [
                                    fareInfo.attr('Key').value(),
                                    fareInfo.attr('FareBasis').value(),
                                    fareInfo.attr('EffectiveDate').value(),
                                    getFareRules(fareInfo)
                                ].join('§');
                            }).join('±'),
                            pricingInfo.find('air:BookingInfo', engine.nsUri).map(function (bookingInfo) {
                                return [
                                    bookingInfo.attr('BookingCode').value(),
                                    bookingInfo.attr('FareInfoRef').value(),
                                    bookingInfo.attr('SegmentRef').value()
                                ].join('§');
                            }).join('±')
                        ].join('~');
                    }).join('|'),
                    segments: [],
                    seats: parameters.seats,
                    ltt: engine.getNodeAttr(pricingInfos[0], 'LatestTicketingTime'),
                    hosttoken: airPricingSolution.get('common_v38_0:HostToken', engine.nsUri) !== undefined ?
                        {
                            ref: engine.getNodeAttr(airPricingSolution.get('common_v38_0:HostToken', engine.nsUri), 'Key'),
                            text: airPricingSolution.get('common_v38_0:HostToken', engine.nsUri).text()
                        } :
                        null
                },
                provider: profileConfig.providerSettings.code,
                carrier: {
                    code: engine.getNodeAttr(pricingInfos[0], 'PlatingCarrier') || segment.attr('Carrier').value(),
                    name: ''
                },
                eticket: (engine.getNodeAttr(pricingInfos[0], 'ETicketability') == 'Yes'),
                latinRegistration: true,
                timeLimit: engine.getNodeAttr(pricingInfos[0], 'LatestTicketingTime'),
                gds: engine.getGDS(airPricingSolution.get('air:AirPricingInfo', engine.nsUri).attr('ProviderCode').value()),
                itineraries: []
            };

        let curGroup = -1, sGroup = -1, dopSegm;

        journeys.map(function(journey) {
            let flight = { segments: [] },
                segments = journey.find('air:AirSegmentRef', engine.nsUri),
                bookingInfo, airFareInfo;

            segments.map(function(segment, segmentIdx) {
                let scbsSegment = scbsKit.getSegment(),
                    segmentReference = segment.attr('Key').value(),
                    airSegment = xmlDoc.get("//air:AirSegment[@Key='" + segmentReference + "']", engine.nsUri),
                    flightDetails = priceNotFlights
                        ? airSegment.get('air:FlightDetails', engine.nsUri)
                        : xmlDoc.get("//air:FlightDetailsList/air:FlightDetails[@Key='" + airSegment.get("air:FlightDetailsRef", engine.nsUri).attr('Key').value() + "']", engine.nsUri),
                dateBegin = engine.getNodeAttr(flightDetails, 'DepartureTime'),
                dateEnd = engine.getNodeAttr(flightDetails, 'ArrivalTime');

                if (engine.getNodeAttr(airSegment, 'Carrier')) {
                    scbsSegment.carrier = {code: engine.getNodeAttr(airSegment, 'Carrier')};
                }

                if (airSegment.get('air:CodeshareInfo', engine.nsUri) &&
                    engine.getNodeAttr(airSegment.get('air:CodeshareInfo', engine.nsUri), 'OperatingCarrier')) {
                    scbsSegment.carrier = {code: engine.getNodeAttr(airSegment.get('air:CodeshareInfo', engine.nsUri), 'OperatingCarrier')};
                    scbsSegment.operatingCarrier = clone(scbsSegment.carrier);
                }

                bookingInfo = airPricingSolution.get('air:AirPricingInfo/air:BookingInfo[@SegmentRef="' + segmentReference + '"]', engine.nsUri);
                scbsSegment.serviceClass = bookingInfo.attr('CabinClass').value();
                scbsSegment.bookingClass = bookingInfo.attr('BookingCode').value();
                scbsSegment.flightNumber = engine.getNodeAttr(airSegment, 'FlightNumber');
                scbsSegment.equipment.code = engine.getNodeAttr(flightDetails, 'Equipment');
                scbsSegment.locationBegin.code = engine.getNodeAttr(flightDetails, 'Origin');
                scbsSegment.locationEnd.code = engine.getNodeAttr(flightDetails, 'Destination');
                scbsSegment.dateBegin = (dateBegin === false) ? "" : dateBegin;
                scbsSegment.dateEnd = (dateEnd === false) ? "" : dateEnd;
                scbsSegment.travelDuration = getTravelDuration(airSegment),
                    scbsSegment.terminalBegin = engine.getNodeAttr(flightDetails, 'OriginTerminal');
                scbsSegment.terminalEnd = engine.getNodeAttr(flightDetails, 'DestinationTerminal');
                scbsSegment.methLocomotion = "AVIA";
                if(scbsSegment.equipment.code == 'TRN') {
                    scbsSegment.methLocomotion = 'TRAIN';
                }
                scbsSegment.token = engine.getNodeAttr(airSegment, 'Key');

                let airFareInfoRefsFlight = bookingInfo.parent().find('air:FareInfoRef', engine.nsUri),
                    airFareInfoRef = bookingInfo.attr('FareInfoRef').value();

                if(airFareInfoRefsFlight && airFareInfoRefsFlight[0]) {
                    airFareInfo = xmlDoc.get("//air:FareInfoList/air:FareInfo[@Key='" + airFareInfoRef + "']", engine.nsUri);
                } else { // flightfares response
                    airFareInfo = xmlDoc.get("//air:FareInfo[@Key='" + airFareInfoRef + "']", engine.nsUri);
                }

                if (airFareInfo !== undefined) {
                    dopSegm = engine.getSegmDopInfo(airFareInfo);
                    scbsSegment.fareBasis = dopSegm.fareBasis;
                    scbsSegment.baggage.value = dopSegm.baggage;
                }

                if(priceNotFlights) {
                    curGroup = engine.getNodeAttr(airSegment, 'Group');

                    if(segmentIdx != 0 && curGroup != sGroup) {
                        pricing.token.segments[pricing.token.segments.length - 1] = pricing.token.segments[pricing.token.segments.length - 1].replace(/\|1$/, '|0');
                        pricing.itineraries.push({token: "-", flights: [flight]});
                        flight = {
                            segments: []
                        };
                    }
                }

                if (dopSegm !== undefined) {
                    airSegment.attr({FareBasis: dopSegm.fareBasis});
                    airSegment.attr({BrandId: dopSegm.brandId});
                    airSegment.attr({BookingCode: scbsSegment.bookingClass});
                }

                flight.segments.push(scbsSegment);
                pricing.token.segments.push(engine.encodeSegment(airSegment) + '|1');
                sGroup = curGroup;
            });
            pricing.token.segments[pricing.token.segments.length - 1] = pricing.token.segments[pricing.token.segments.length - 1].replace(/\|1$/, '|0');
            pricing.itineraries.push({token: "-", flights: [flight]});
        });

        pricing.token.segments = pricing.token.segments.join(engine.segmentsSeparator);
        pricing.token = tokenCrypt.encode(pricing.token);
        pricing.fares = scbsKit.getFares();

        var totalFareConverted = currency.convertAmount(
            engine.parsePrice(engine.getNodeAttr(airPricingSolution, 'TotalPrice')),
            responseCurrency,
            parameters.currency,
            null,
            engine.code,
            'flights',
            'TOTAL'
        );

        pricing.fares.fareTotal = totalFareConverted;

        pricingInfos.map(function(pricingInfo){
            let passenger = pricingInfo.find('air:PassengerType', engine.nsUri);
            let seat = scbsKit.getFareSeat();

            seat.passengerType = engine.passengerClass[passenger[0].attr('Code').value()];
            seat.count = passenger.length;
            seat.prices = (function (pricingInfo) {
                let prices = [],
                    taxes = pricingInfo.find('air:TaxInfo', engine.nsUri);

                prices.push(scbsKit.getPrice(
                    'TARIFF',
                    '',
                    engine.parsePrice(engine.getNodeAttr(pricingInfo, 'EquivalentBasePrice', 'BasePrice')),
                    responseCurrency,
                    parameters.currency
                ));

                taxes.map(function (tax) {
                    prices.push(scbsKit.getPrice(
                        'TAXES',
                        engine.getNodeAttr(tax, 'Category'),
                        engine.parsePrice(engine.getNodeAttr(tax, 'Amount')),
                        responseCurrency,
                        parameters.currency
                    ));
                });

                return prices;
            }(pricingInfo));

            seat.total = scbsKit.getFareSeatTotal(seat.prices);

            pricing.fares.fareSeats.push(seat);
        });

        solutions.push(pricing);
    });

    return solutions;
};

/**
 * Ищет в xml упоминание валюты
 * @param xmlDoc
 * @return {*}
 */
const getResponseCurrency = function(xmlDoc) {
    let responseCurrency;

    if (xmlDoc.get('//air:LowFareSearchRsp', engine.nsUri) !== undefined) {
        responseCurrency = xmlDoc.get('//air:LowFareSearchRsp', engine.nsUri).attr('CurrencyType').value();
    } else {
        if (xmlDoc.get('//air:AirPricingSolution', engine.nsUri)) {
            let found = xmlDoc.get('//air:AirPricingSolution', engine.nsUri).attr('TotalPrice').value().match(/([A-Z]{3})([0-9]+)/);
            if (found[1] !== undefined) {
                responseCurrency = found[1];
            }
        }
    }

    return responseCurrency;
};

const getFareRules = function (fareInfo) {
    var rules = [];
    fareInfo.find('air:FareRuleKey', engine.nsUri).map(function(FareRuleKey) {
        rules.push(FareRuleKey.text());
    });
    return rules.join(',');
};

/* костыль для SIP, так как временные зоны не совпадают */
const getTravelDuration = function(segment) {
    let duration = 0,
        isSIPDeparture = engine.getNodeAttr(segment, 'Origin') === 'SIP',
        isSIPArrival = engine.getNodeAttr(segment, 'Destination') === 'SIP';

    if (isSIPArrival || isSIPDeparture) {
        let departureDateData = engine.getNodeAttr(segment, 'DepartureTime').split('+'),
            arrivalDateData = engine.getNodeAttr(segment, 'ArrivalTime').split('+');

        // все приводим в GMT и считаем разницу
        let timezoneDeparture = isSIPDeparture ? sipTimezone : departureDateData[1].replace(':', ''),
            timezoneArrival = isSIPArrival ? sipTimezone : arrivalDateData[1].replace(':', ''),
            dateDeparture = new Date(departureDateData[0] + '+' + timezoneDeparture),
            dateArrival = new Date(arrivalDateData[0] + '+' + timezoneArrival);

        duration = (Date.UTC(dateArrival.getFullYear(), dateArrival.getMonth(), dateArrival.getDate(), dateArrival.getHours(), dateArrival.getMinutes()) -
            Date.UTC(dateDeparture.getFullYear(), dateDeparture.getMonth(), dateDeparture.getDate(), dateDeparture.getHours(), dateDeparture.getMinutes())) / (1000 * 60)
    }

    if ( ! duration) {
        duration = engine.getNodeAttr(segment, 'FlightTime');
    }

    return duration;
};

module.exports = TravelportFlights;