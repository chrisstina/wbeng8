const clone = require('clone'),
    currency = require('../../../utils/scbsCurrency'),
    customTax = require('../../../utils/scbsCustomTax'),
    errors = require('request-promise-native/errors'),
    scbsDate = require('../../../utils/scbsDate'),
    scbsKit = require('../../../utils/scbsKit'),
    tokenCrypt = require('../../../core/tokenCrypt'),
    xmljs = require('libxmljs');

var engine;

var SabreFlights = function (operationEngine) {
    engine = operationEngine;
};

/**
 * Цепочка запросов для поиска вариантов перелета
 *
 * @param {type} context
 * @param {type} parameters
 * @param {type} profileConfig
 * @returns {Promise<Array>}
 */
SabreFlights.prototype.execute = function (context, parameters, profileConfig) {
    var sessions = {};
    return openSession(profileConfig, parameters)
        .then((sessionToken) => {
            return sessionToken;
        })
        .then((sessionToken) => {
            sessions[context.WBtoken] = sessionToken;
            return getFlights(profileConfig, parameters, sessionToken);
        })
        .then((flightsList) => {
            console.log(sessions[context.WBtoken]); // @todo проверить, не перезаписываются ли сессии при параллельных запросах
            closeSession(profileConfig, parameters, sessions[context.WBtoken])
                .catch((err) => {
                    console.error('Session close error: ' + err.message);
                }); // отправляем запрос на закрытие, и сразу возвращаем результат
            return flightsList;
        })
        .catch((err) => {
            throw err; // далее эта ошибка обработается в routes.js
        });
};

/**
 * Формирует и отправляет запрос на открытие сессии
 *
 * @param profileConfig
 * @param parameters
 * @returns {Request}
 */
let openSession = function (profileConfig, parameters) {
    let xmlRequest = engine.wrapRequest(new xmljs.Document(), profileConfig, 'Session', 'SessionCreateRQ');
    return engine.request(xmlRequest, parseSessionResponse, profileConfig, parameters);
};

/**
 * Формирует и отправляет запрос поиска
 *
 * @param profileConfig
 * @param parameters
 * @param sessionToken
 * @returns {Request}
 */
let getFlights = function (profileConfig, parameters, sessionToken) {
    let xmlBody = buildFlightsRequest(profileConfig, parameters);
    let xmlRequest = engine.wrapRequest(xmlBody, profileConfig, 'Air Shopping Service', 'BargainFinderMaxRQ', sessionToken);
    return engine.request(xmlRequest, parseFlightsResponse, profileConfig, parameters);
};

let closeSession = function (profileConfig, parameters, sessionToken) {
    let xmlRequest = engine.wrapRequest(new xmljs.Document(), profileConfig, 'Session', 'SessionCloseRQ', sessionToken);
    return engine.request(xmlRequest, null, profileConfig, parameters);
};

/**
 * Вытаскивает токен сессии из ответа Sabre
 *
 * @param {type} body ответ raw XML
 */
let parseSessionResponse = function (body) {
    return body.get('//wsse:BinarySecurityToken', engine.nsUri).text();
};

let buildFlightsRequest = function (profileConfig, parameters) {
    let xmlDoc = new xmljs.Document(), cursor;

    cursor = xmlDoc.node('OTA_AirLowFareSearchRQ').attr({
        Target: 'Production',
        Version: '3.4.0',
        ResponseType: 'OTA',
        ResponseVersion: '3.4.0',
        xmlns: 'http://www.opentravel.org/OTA/2003/05',
        AvailableFlightsOnly: true
    });

    cursor = cursor
        .node('POS')
            .node('Source').attr({PseudoCityCode: profileConfig.pcc.search})
                .node('RequestorID').attr({ID: 1, Type: 1})
                    .node('CompanyName').attr({Code: 'TN'})
                    .parent()
                .parent()
            .parent()
        .parent();

    parameters.route.map(function (leg, index) {
        cursor = cursor
            .node('OriginDestinationInformation').attr({RPH: index + 1})
            .node('DepartureDateTime').text(leg.date.split('+')[0]).parent()
            .node('OriginLocation').attr({LocationCode: leg.locationBegin.code}).parent()
            .node('DestinationLocation').attr({LocationCode: leg.locationEnd.code}).parent()
            .parent();
    });

    let travelPref = {ValidInterlineTicket: true};

    if (parameters.skipConnected === true || parameters.skipConnected === "true") {
        travelPref.MaxStopsQuantity = 0;
    }

    cursor = cursor.node('TravelPreferences').attr(travelPref);

    if (profileConfig.denyAirlines.length > 0) {
        profileConfig.denyAirlines.map(function (airline) {
            cursor = cursor.node('VendorPref').attr({Code: airline, PreferLevel: 'Unacceptable'}).parent();
        });
    }

    if (parameters.preferredAirlines.length > 0) {
        parameters.preferredAirlines.map(function (airline) {
            cursor = cursor.node('VendorPref').attr({Code: airline.code, PreferLevel: 'Preferred'}).parent();
        });
    }

    cursor = cursor.node('CabinPref').attr({
        Cabin: engine.getServiceClass(parameters.serviceClass),
        PreferLevel: 'Only'
    }).parent();

    cursor = cursor.node('TPA_Extensions');
    cursor = cursor.node('LongConnectTime').attr({Enable: true, Max: '1200'}).parent();
    cursor = cursor.parent(); // TPA_Extensions
    cursor = cursor.parent(); // TravelPreferences

    cursor = cursor.node('TravelerInfoSummary')
        .node('AirTravelerAvail');

    parameters.seats.map(function (seat) {
        cursor = cursor
            .node('PassengerTypeQuantity').attr({
                Code: engine.getSeatCode(seat.passengerType),
                Quantity: seat.count
            }).parent();
    });
    cursor = cursor
        .parent()
        .parent();

    cursor = cursor.node('TPA_Extensions')
        .node('IntelliSellTransaction')
            .node('RequestType').attr({Name: "200ITINS"}).parent()
        .parent()
    .parent(); //TPA_Extensions

    return xmlDoc;
};

let parseFlightsResponse = function (xmlDoc, profileConfig, parameters) {
    let isDiscounted = false,
        timezone = engine.getPCCTimezone(profileConfig);

    parameters.seats.map(function (seat) {
        if (seat.passengerType === engine.passengerTypes.senior.title ||
            seat.passengerType === engine.passengerTypes.youth.title) {
            isDiscounted = true;
        }
    });

    let result = xmlDoc.find('//R:PricedItineraries/R:PricedItinerary', engine.nsUri)
        .map(function (pricedItinerary) {
            let validatingCarrier,
                carrierNode = pricedItinerary.get('R:TPA_Extensions/R:ValidatingCarrier', engine.nsUri),
                totalFare = pricedItinerary.get('R:AirItineraryPricingInfo/R:ItinTotalFare/R:TotalFare', engine.nsUri),
                fareIdx = 0,
                totalFareConverted = currency.convertAmount(
                    parseFloat(totalFare.attr('Amount').value()),
                    totalFare.attr('CurrencyCode').value(),
                    parameters.currency,
                    null,
                    engine,
                    'flights',
                    null,
                    'TOTAL'),
                fareRuleBasises = [],
                isComplexFlight = false;

            if (isDiscounted && ! isPTCTypeMatch(pricedItinerary.find('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown/R:PassengerFare/R:TPA_Extensions/R:Messages/R:Message', engine.nsUri))) {
                return {token: null};
            } else {
                validatingCarrier = (carrierNode !== null) ?
                    carrierNode.attr("Code").value() :
                    pricedItinerary.get('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption/R:FlightSegment/R:MarketingAirline', engine.nsUri).attr('Code').value();

                var flightGroup = scbsKit.getFlightGroup();

                flightGroup.provider = profileConfig.providerSettings.code;
                flightGroup.gds = profileConfig.providerSettings.name;
                flightGroup.carrier = {code: validatingCarrier};
                flightGroup.eticket = true;
                flightGroup.latinRegistration = true;

                flightGroup.timeLimit = pricedItinerary.get('R:AirItineraryPricingInfo', engine.nsUri).attr('LastTicketDate')
                    ? scbsDate.formatISODate(pricedItinerary.get('R:AirItineraryPricingInfo', engine.nsUri).attr('LastTicketDate').value(), timezone)
                    : scbsDate.formatISODate(new Date(), timezone);

                flightGroup.itineraries = pricedItinerary.find('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption', engine.nsUri)
                    .map(function (originDestinationOption) {
                        return {
                            flights: [{
                                token: "",
                                seatsAvailable: pricedItinerary.get('R:AirItineraryPricingInfo/R:FareInfos/R:FareInfo/R:TPA_Extensions/R:SeatsRemaining', engine.nsUri).attr('Number').value(),
                                segments: originDestinationOption.find('R:FlightSegment', engine.nsUri)
                                    .map(function (flightSegment) {
                                        var segment = scbsKit.getSegment(),
                                            fareBreakdown = pricedItinerary.get('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown', engine.nsUri),
                                            fareInfo = pricedItinerary.get('R:AirItineraryPricingInfo/R:FareInfos/R:FareInfo[position() = ' + (fareIdx + 1) + ']', engine.nsUri),
                                            segmentFareBasis = fareBreakdown.get('R:FareBasisCodes/R:FareBasisCode[position() = ' + (++fareIdx) + ']', engine.nsUri).text();
                                        fareRuleBasises.push(segmentFareBasis),
                                            equipmentCode = flightSegment.get('R:Equipment', engine.nsUri).attr('AirEquipType').value();

                                        segment.serviceClass = fareInfo !== undefined ? engine.getTitleByCode(fareInfo.get('R:TPA_Extensions/R:Cabin', engine.nsUri).attr('Cabin').value()) : '';
                                        segment.bookingClass = flightSegment.attr('ResBookDesigCode').value();
                                        segment.flightNumber = flightSegment.attr('FlightNumber').value();
                                        segment.travelDuration = engine.getTravelDuration(flightSegment);
                                        if (flightSegment.get('R:MarketingAirline', engine.nsUri)) {
                                            segment.carrier = {code: flightSegment.get('R:MarketingAirline', engine.nsUri).attr('Code').value()};
                                            segment.marketingCarrier = clone(segment.carrier);
                                        }
                                        if (flightSegment.get('R:OperatingAirline', engine.nsUri)) {
                                            segment.carrier = {code: flightSegment.get('R:OperatingAirline', engine.nsUri).attr('Code').value()};
                                            segment.operatingCarrier = clone(segment.carrier);
                                        }
                                        segment.equipment = {code: equipmentCode};
                                        segment.locationBegin = {code: flightSegment.get('R:DepartureAirport', engine.nsUri).attr('LocationCode').value()};
                                        segment.locationEnd = {code: flightSegment.get('R:ArrivalAirport', engine.nsUri).attr('LocationCode').value()};
                                        segment.dateBegin = flightSegment.attr('DepartureDateTime').value();
                                        segment.dateEnd = flightSegment.attr('ArrivalDateTime').value();
                                        segment.terminalBegin = flightSegment.get('R:DepartureAirport', engine.nsUri).attr('TerminalID')
                                            ? flightSegment.get('R:DepartureAirport', engine.nsUri).attr('TerminalID').value() : '';
                                        segment.terminalEnd = flightSegment.get('R:ArrivalAirport', engine.nsUri).attr('TerminalID')
                                            ? flightSegment.get('R:ArrivalAirport', engine.nsUri).attr('TerminalID').value() : '';
                                        segment.fareBasis = segmentFareBasis;
                                        segment.methLocomotion = engine.getMethLocomotion(equipmentCode);

                                        if (flightSegment.get('R:StopAirports', engine.nsUri) !== null) {
                                            flightSegment.find('R:StopAirports/R:StopAirport', engine.nsUri).map(function (stop) {
                                                var landing = scbsKit.getLanding();
                                                landing.locationCode.code = stop.attr('LocationCode').value();
                                                landing.dateBegin = stop.attr('DepartureDateTime').value();
                                                landing.dateEnd = stop.attr('ArrivalDateTime').value();
                                                segment.landings.push(landing);
                                            });
                                        }

                                        return segment;
                                    })
                            }]
                        };
                    });

                var zzTaxes = customTax.getCustomTaxes(profileConfig, totalFareConverted),
                    fareTotalWithZZ = customTax.getTotalWithCustomTaxes(zzTaxes, totalFareConverted);

                flightGroup.fares = {
                    fareDesc: {},
                    fareSeats: pricedItinerary.find('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown', engine.nsUri)
                        .map(function (fare) {
                            let tariffSource = fare.get('R:PassengerFare/R:EquivFare', engine.nsUri) ?
                                'EquivFare' : (fare.get('R:PassengerFare/R:BaseFare', engine.nsUri) ?
                                    'BaseFare' : null);


                            return {
                                passengerType: engine.getSeatCode(fare.get('R:PassengerTypeQuantity', engine.nsUri).attr('Code').value()),
                                count: parseInt(fare.get('R:PassengerTypeQuantity', engine.nsUri).attr('Quantity').value()),
                                prices: [].concat([
                                        tariffSource !== null ? scbsKit.getPrice(
                                            'TARIFF',
                                            '',
                                            parseFloat(fare.get('R:PassengerFare/R:' + tariffSource, engine.nsUri).attr('Amount').value()),
                                            fare.get('R:PassengerFare/R:' + tariffSource, engine.nsUri).attr('CurrencyCode').value(),
                                            parameters.currency,
                                            null,
                                            engine,
                                            'flights',
                                            null)
                                            : 0
                                    ], fare.find('R:PassengerFare/R:Taxes/R:Tax', engine.nsUri).map(function (Tax) {
                                        return scbsKit.getPrice(
                                            'TAXES',
                                            Tax.attr('TaxCode').value(),
                                            parseFloat(Tax.attr('Amount').value()),
                                            Tax.attr('CurrencyCode').value(),
                                            parameters.currency,
                                            null,
                                            engine,
                                            'flights',
                                            null);
                                    }),
                                    zzTaxes),
                                fareTotal: fareTotalWithZZ
                            };
                        }),
                    fareTotal: fareTotalWithZZ
                };

                isComplexFlight = (parameters.route.length > 2 || (parameters.route.length === 2 && parameters.route[0].locationBegin.code !== parameters.route[1].locationEnd.code)); // для проверки структуры при прайсе

                flightGroup.token = tokenCrypt.encode({
                    provider: engine.code,
                    seats: parameters.seats,
                    fareRuleBasises: fareRuleBasises,
                    requestedItineraries: parameters.route.length,
                    isComplexFlight: isComplexFlight,
                    odo: pricedItinerary.find('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption', engine.nsUri)
                        .map(function (OriginDestinationOption) {
                            let isStarting = true;
                            return OriginDestinationOption.find('R:FlightSegment', engine.nsUri)
                                .map(function (FlightSegment) {
                                    let tokenSrc = [
                                        FlightSegment.attr('DepartureDateTime').value(),
                                        FlightSegment.attr('FlightNumber').value(),
                                        FlightSegment.get('R:ArrivalAirport', engine.nsUri).attr('LocationCode').value(),
                                        FlightSegment.get('R:MarketingAirline', engine.nsUri).attr('Code').value(),
                                        FlightSegment.get('R:DepartureAirport', engine.nsUri).attr('LocationCode').value(),
                                        FlightSegment.attr('ResBookDesigCode').value(),
                                        FlightSegment.attr('ArrivalDateTime').value(),
                                        FlightSegment.get('R:Equipment', engine.nsUri).attr('AirEquipType').value(),
                                        FlightSegment.get('R:MarriageGrp', engine.nsUri).text(),
                                        FlightSegment.attr('ElapsedTime').value(),
                                        isStarting
                                    ].join('§');
                                    isStarting = false;
                                    return tokenSrc;
                                }).join('~');
                        }).join('|'),
                    requestedServiceClass: parameters.serviceClass, // для flightfares
                    requestedRoute: parameters.route, // для flightfares
                    carrier: pricedItinerary.get('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption/R:FlightSegment/R:MarketingAirline', engine.nsUri).attr('Code').value()
                });

                return flightGroup;
            }
        }).filter(function (group) {
            return group.token !== null;
        });

    return result;
};

let isPTCTypeMatch = function(messageNodes) {
    for (var i in messageNodes) {
        if (messageNodes[i].attr('Info').value().indexOf('NOT APPLICABLE - ADT FARE USED') !== -1) {
            return false;
        }
    }
    return true;
}

module.exports = SabreFlights;