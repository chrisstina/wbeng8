const provider = require('../sabre'),
    scbsKit = require('../../../utils/scbsKit'),
    currency = require('../../../utils/scbsCurrency'),
    customTax = require('../../../utils/scbsCustomTax'),
    errors = require('request-promise-native/errors'),
    xmljs = require('libxmljs');

var SabreFlights = function () {
};

/**
 * Цепочка запросов для поиска вариантов перелета
 *
 * @param {type} context
 * @param {type} parameters
 * @param {type} profileConfig
 * @returns {Promise}
 */
SabreFlights.prototype.execute = function (context, parameters, profileConfig) {
    console.info('Токен запроса %s', context.WBtoken);
    console.time("Sabre flights executed in");

    return openSession(profileConfig, parameters)
        .then((sessionToken) => {
            return sessionToken;
        })
        .then((sessionToken) => {
            return getFlights(profileConfig, parameters, sessionToken);
        })
        .then((sessionToken) => {
            return closeSession(profileConfig, parameters, sessionToken);
        })
        .catch((err) => {
            console.log(err instanceof errors.TransformError); // значит, это ошибка парсинга
            console.timeEnd("Sabre flights executed in");
            return err;
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
    let xmlRequest = provider.buildRequest(new xmljs.Document(), profileConfig, 'Session', 'SessionCreateRQ');
    return provider.request(xmlRequest, parseSessionResponse, profileConfig, parameters);
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
    let xmlRequest = provider.buildRequest(xmlBody, profileConfig, 'Air Shopping Service', 'BargainFinderMaxRQ', sessionToken);
    return provider.request(xmlRequest, parseFlightsResponse, profileConfig, parameters);
};

/**
 * Вытаскивает токен сессии из ответа Sabre
 *
 * @param {type} body ответ raw XML
 */
let parseSessionResponse = function (body) {
    return body.get('//wsse:BinarySecurityToken', provider.nsUri).text();
};

let closeSession = function (profileConfig, parameters, context, token) {
    console.log("closeSession", token);
    return Promise.resolve();
    /*return request({
      method: "POST",
      uri: "http://ttb:8080",
      form: parameters
    })
    .then(function (body) {
      return true;
    })
    .catch(function (error) {
      throw  basicError.getError(basicError.NETWORK_ERR, error);
    }); */
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
        Cabin: provider.serviceClass[parameters.serviceClass],
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
                Code: provider.seatCode(seat.passengerType),
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
        timezone = provider.getPCCTimezone(profileConfig);

    parameters.seats.map(function (seat) {
        if (seat.passengerType === provider.passengerTypes.senior.title ||
            seat.passengerType === provider.passengerTypes.youth.title) {
            isDiscounted = true;
        }
    });

    console.log(''+xmlDoc);

    let result = xmlDoc.find('//R:PricedItineraries/R:PricedItinerary', provider.nsUri)
        .map(function (pricedItinerary) {
            let validatingCarrier,
                carrierNode = pricedItinerary.get('R:TPA_Extensions/R:ValidatingCarrier', provider.nsUri),
                totalFare = pricedItinerary.get('R:AirItineraryPricingInfo/R:ItinTotalFare/R:TotalFare', provider.nsUri),
                fareIdx = 0,
                totalFareConverted = currency.convertAmount(
                    parseFloat(totalFare.attr('Amount').value()),
                    totalFare.attr('CurrencyCode').value(),
                    parameters.currency,
                    null,
                    provider,
                    'flights',
                    null,
                    'TOTAL'),
                fareRuleBasises = [],
                isComplexFlight = false;

            if (isDiscounted && ! isPTCTypeMatch(pricedItinerary.find('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown/R:PassengerFare/R:TPA_Extensions/R:Messages/R:Message', provider.nsUri))) {
                return {token: null};
            } else {
                validatingCarrier = (carrierNode !== null) ?
                    carrierNode.attr("Code").value() :
                    pricedItinerary.get('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption/R:FlightSegment/R:MarketingAirline', provider.nsUri).attr('Code').value();

                var flightGroup = scbsKit.getFlightGroup();

                flightGroup.provider = provider.code;
                flightGroup.gds = provider.name;
                flightGroup.carrier = {code: validatingCarrier};
                flightGroup.eticket = true;
                flightGroup.latinRegistration = true;

                flightGroup.timeLimit = pricedItinerary.get('R:AirItineraryPricingInfo', provider.nsUri).attr('LastTicketDate')
                    ? provider.formatISODate(pricedItinerary.get('R:AirItineraryPricingInfo', provider.nsUri).attr('LastTicketDate').value(), timezone)
                    : provider.formatISODate(new Date(), timezone);

                flightGroup.itineraries = pricedItinerary.find('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption', provider.nsUri)
                    .map(function (originDestinationOption) {
                        return {
                            flights: [{
                                token: tokenCrypt.encode({}),
                                seatsAvailable: pricedItinerary.get('R:AirItineraryPricingInfo/R:FareInfos/R:FareInfo/R:TPA_Extensions/R:SeatsRemaining', provider.nsUri).attr('Number').value(),
                                segments: originDestinationOption.find('R:FlightSegment', provider.nsUri)
                                    .map(function (flightSegment) {
                                        var segment = scbsKit.getSegment(),
                                            fareBreakdown = pricedItinerary.get('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown', provider.nsUri),
                                            fareInfo = pricedItinerary.get('R:AirItineraryPricingInfo/R:FareInfos/R:FareInfo[position() = ' + (fareIdx + 1) + ']', provider.nsUri),
                                            segmentFareBasis = fareBreakdown.get('R:FareBasisCodes/R:FareBasisCode[position() = ' + (++fareIdx) + ']', provider.nsUri).text();
                                        fareRuleBasises.push(segmentFareBasis),
                                            equipmentCode = flightSegment.get('R:Equipment', provider.nsUri).attr('AirEquipType').value();

                                        segment.serviceClass = fareInfo !== undefined ? provider.getTitleByCode(fareInfo.get('R:TPA_Extensions/R:Cabin', provider.nsUri).attr('Cabin').value()) : '';
                                        segment.bookingClass = flightSegment.attr('ResBookDesigCode').value();
                                        segment.flightNumber = flightSegment.attr('FlightNumber').value();
                                        segment.travelDuration = self.getTravelDuration(flightSegment);
                                        if (flightSegment.get('R:MarketingAirline', provider.nsUri)) {
                                            segment.carrier = {code: flightSegment.get('R:MarketingAirline', provider.nsUri).attr('Code').value()};
                                            segment.marketingCarrier = clone(segment.carrier);
                                        }
                                        if (flightSegment.get('R:OperatingAirline', provider.nsUri)) {
                                            segment.carrier = {code: flightSegment.get('R:OperatingAirline', provider.nsUri).attr('Code').value()};
                                            segment.operatingCarrier = clone(segment.carrier);
                                        }
                                        segment.equipment = {code: equipmentCode};
                                        segment.locationBegin = {code: flightSegment.get('R:DepartureAirport', provider.nsUri).attr('LocationCode').value()};
                                        segment.locationEnd = {code: flightSegment.get('R:ArrivalAirport', provider.nsUri).attr('LocationCode').value()};
                                        segment.dateBegin = flightSegment.attr('DepartureDateTime').value();
                                        segment.dateEnd = flightSegment.attr('ArrivalDateTime').value();
                                        segment.terminalBegin = flightSegment.get('R:DepartureAirport', provider.nsUri).attr('TerminalID')
                                            ? flightSegment.get('R:DepartureAirport', provider.nsUri).attr('TerminalID').value() : '';
                                        segment.terminalEnd = flightSegment.get('R:ArrivalAirport', provider.nsUri).attr('TerminalID')
                                            ? flightSegment.get('R:ArrivalAirport', provider.nsUri).attr('TerminalID').value() : '';
                                        segment.fareBasis = segmentFareBasis;
                                        segment.methLocomotion = provider.getMethLocomotion(equipmentCode);

                                        if (flightSegment.get('R:StopAirports', provider.nsUri) !== null) {
                                            flightSegment.find('R:StopAirports/R:StopAirport', provider.nsUri).map(function (stop) {
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
                    fareSeats: pricedItinerary.find('R:AirItineraryPricingInfo/R:PTC_FareBreakdowns/R:PTC_FareBreakdown', provider.nsUri)
                        .map(function (Fare) {
                            var tariffSource = Fare.get('R:PassengerFare/R:EquivFare', provider.nsUri) ?
                                'EquivFare' : (Fare.get('R:PassengerFare/R:BaseFare', provider.nsUri) ?
                                    'BaseFare' : null);
                            return {
                                passengerType: provider.seatCode(Fare.get('R:PassengerTypeQuantity', provider.nsUri).attr('Code').value()),
                                count: parseInt(Fare.get('R:PassengerTypeQuantity', provider.nsUri).attr('Quantity').value()),
                                prices: [].concat([
                                        tariffSource !== null ? scbsKit.getPrice(
                                            'TARIFF',
                                            '',
                                            parseFloat(Fare.get('R:PassengerFare/R:' + tariffSource, provider.nsUri).attr('Amount').value()),
                                            Fare.get('R:PassengerFare/R:' + tariffSource, provider.nsUri).attr('CurrencyCode').value(),
                                            parameters.currency,
                                            null,
                                            provider,
                                            'flights',
                                            null)
                                            : 0
                                    ], Fare.find('R:PassengerFare/R:Taxes/R:Tax', provider.nsUri).map(function (Tax) {
                                        return scbsKit.getPrice(
                                            'TAXES',
                                            Tax.attr('TaxCode').value(),
                                            parseFloat(Tax.attr('Amount').value()),
                                            Tax.attr('CurrencyCode').value(),
                                            parameters.currency,
                                            null,
                                            provider,
                                            self);
                                    }),
                                    zzTaxes),
                                fareTotal: fareTotalWithZZ
                            };
                        }),
                    fareTotal: fareTotalWithZZ
                };

                isComplexFlight = (parameters.route.length > 2 || (parameters.route.length === 2 && parameters.route[0].locationBegin.code !== parameters.route[1].locationEnd.code)); // для проверки структуры при прайсе

                flightGroup.token = tokenCrypt.encode({
                    provider: provider.code,
                    seats: parameters.seats,
                    fareRuleBasises: fareRuleBasises,
                    requestedItineraries: parameters.route.length,
                    isComplexFlight: isComplexFlight,
                    odo: pricedItinerary.find('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption', provider.nsUri)
                        .map(function (OriginDestinationOption) {
                            var isStarting = true;
                            return OriginDestinationOption.find('R:FlightSegment', provider.nsUri)
                                .map(function (FlightSegment) {
                                    var tokenSrc = [
                                        FlightSegment.attr('DepartureDateTime').value(),
                                        FlightSegment.attr('FlightNumber').value(),
                                        FlightSegment.get('R:ArrivalAirport', provider.nsUri).attr('LocationCode').value(),
                                        FlightSegment.get('R:MarketingAirline', provider.nsUri).attr('Code').value(),
                                        FlightSegment.get('R:DepartureAirport', provider.nsUri).attr('LocationCode').value(),
                                        FlightSegment.attr('ResBookDesigCode').value(),
                                        FlightSegment.attr('ArrivalDateTime').value(),
                                        FlightSegment.get('R:Equipment', provider.nsUri).attr('AirEquipType').value(),
                                        FlightSegment.get('R:MarriageGrp', provider.nsUri).text(),
                                        FlightSegment.attr('ElapsedTime').value(),
                                        isStarting
                                    ].join('§');
                                    isStarting = false;
                                    return tokenSrc;
                                }).join('~');
                        }).join('|'),
                    requestedServiceClass: parameters.serviceClass, // для flightfares
                    requestedRoute: parameters.route, // для flightfares
                    carrier: pricedItinerary.get('R:AirItinerary/R:OriginDestinationOptions/R:OriginDestinationOption/R:FlightSegment/R:MarketingAirline', provider.nsUri).attr('Code').value()
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

module.exports = new SabreFlights();