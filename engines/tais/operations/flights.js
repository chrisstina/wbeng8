const currency = require('../../../utils/scbsCurrency'),
    scbsKit = require('../../../utils/scbsKit'),
    tokenCrypt = require('./../../../core/tokenCrypt');

const xmljs = require('libxmljs');

var engine;

var TaisFlights = function (operationEngine) {
    engine = operationEngine;
};

/**
 * Запрос для поиска вариантов перелета
 *
 * @param {type} context
 * @param {type} parameters
 * @param {type} profileConfig
 * @returns {Promise}
 */
TaisFlights.prototype.execute = function (context, parameters, profileConfig) {
    return getFlights(profileConfig, parameters)
        .then((flightsList) => {
            return flightsList;
        })
        .catch((err) => {
            throw err; // далее эта ошибка обработается в routes.js
        });
};

/**
 * Формирует и отправляет запрос поиска
 *
 * @param profileConfig
 * @param parameters
 * @param sessionToken
 * @returns {Request}
 */
let getFlights = (profileConfig, parameters) => {
    let xmlBody = buildFlightsRequest(parameters, false);
    let xmlRequest = engine.wrapRequest(xmlBody, profileConfig);
    return engine.request(xmlRequest, parseFlightsResponse, profileConfig, parameters);
};

let buildFlightsRequest = (parameters, allBrands) => {
    if (allBrands === undefined) {
        allBrands = false;
    }

    let xmlRequestDocument = new xmljs.Document(), odRef = 0;

    let cursor = xmlRequestDocument
        .node('SIG_AirShopRQ')
        .node('Itinerary');

    parameters.route.map((leg) => {
        cursor = cursor.node('OriginDestination')
            .attr({
                ODRef: odRef++,
                From: leg.locationBegin.code,
                To: leg.locationEnd.code,
                Date: leg.date.split('T')[0]
            })
        .parent();
    });

    cursor = cursor.parent()
        .node('PaxTypes');
    parameters.seats.map((seat) => {
        cursor = cursor.node('PaxType')
                .attr({Count: seat.count})
                .attr(engine.getPaxPair(seat.passengerType))
            .parent();
    });
    cursor = cursor.parent();

    if (parameters.serviceClass || parameters.skipConnected || parameters.preferredAirlines) {
        cursor = cursor.node('FlightPref');
        if (parameters.serviceClass) {
            cursor.attr({Cabin: parameters.serviceClass.charAt(0).toUpperCase() + parameters.serviceClass.slice(1).toLowerCase()});
        }
        if (parameters.skipConnected) {
            cursor.attr({ConnectionPref: 'Direct'});
        }

        if (parameters.preferredAirlines.length > 0) {
            let attributes = {},
                desiredAirlines = [];

            if (allBrands) {
                attributes.byFareBrands = "all";
            }

            parameters.preferredAirlines.map(function (airline) {
                desiredAirlines.push(airline.code);
            });
            attributes.DesiredAirlines = desiredAirlines.join(' ');
            cursor.attr(attributes).parent();
        }
    }

    return xmlRequestDocument;
};

let parseFlightsResponse = (xmlDoc, profileConfig, parameters) => {
    console.log(xmlDoc + '');
    let shopOptions = xmlDoc.find('//SIG:ShopOption', engine.nsUri),
        sessionID = engine.basicEngine.getNodeAttr(xmlDoc.get('//SIG:SIG_AirShopRS', engine.nsUri), 'SessionID'),
        solutions = [],
        ruleKeys = [],
        needIgnore = false;

    if (shopOptions === undefined) {
        return [];
    }

    var shopOptionID, j,
        carrier,
        gds;

    if (parameters.route !== undefined) {
        parameters.route.map((leg) => {
            needIgnore = needIgnore || (engine.ignoredLocations.indexOf(leg.locationBegin.code)!== -1 ||
                engine.ignoredLocations.indexOf(leg.locationEnd.code)!== -1);
        });
    }

    for (var i = 0; i < shopOptions.length; i++) {
        let shopOption = shopOptions[i], ruleKeysDesc = [];

        carrier = shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', engine.nsUri).attr('ValidatingCarrier') ?
            shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', engine.nsUri).attr('ValidatingCarrier').value() :
            shopOption.get('SIG:ItineraryOptions/SIG:ItineraryOption/SIG:FlightSegment', engine.nsUri).attr('Airline').value();

        gds = engine.getGDS(shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', engine.nsUri).attr('CRS').value());

        // фильтруем по а\к
        if( ! filterFlights(gds, carrier, profileConfig)) {
            continue;
        }

        // фильтруем Симферополь- только стыковочные
        if (needIgnore && ! isCombinedFlight(shopOption.attr('Airlines').value())) {
            continue;
        }

        shopOptionID = engine.basicEngine.getNodeAttr(shopOption, 'OptionRef');
        ruleKeys = shopOption.find('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:Rules/SIG:RuleKey', engine.nsUri);

        ruleKeys.map((key, index) => {
            ruleKeysDesc[index] = key.text();
        });

        let flightGroup = scbsKit.getFlightGroup();
        flightGroup.token = tokenCrypt.encode({
            provider: profileConfig.providerSettings.code,
            seats: parameters.seats,
            route: parameters.route,
            code: sessionID + '|' + shopOptionID,
            rules: ruleKeysDesc.join('§'),
            gds: gds
        });
        flightGroup.provider = profileConfig.providerSettings.code;
        flightGroup.carrier = { code: carrier };
        flightGroup.eticket = (shopOption.get('SIG:FareInfo/SIG:Ticketing', engine.nsUri).attr('eTicket').value() === 'true');
        flightGroup.timeLimit = shopOption.get('SIG:FareInfo/SIG:Ticketing', engine.nsUri).attr('TimeLimit').value();
        flightGroup.latinRegistration = (shopOption.get('SIG:BookingGuidelines', engine.nsUri).attr('RussianNamesSupported') !== 'true');
        flightGroup.gds = gds;
        flightGroup.itineraries = engine.parseItineraries(
            shopOption.find('SIG:ItineraryOptions/SIG:ItineraryOption', engine.nsUri),
            sessionID,
            shopOptionID,
            shopOption);

        let totalConverted = currency.convertAmount(
                parseFloat(engine.basicEngine.getNodeAttr(shopOption, 'Total')),
                engine.basicEngine.getNodeAttr(shopOption, 'Currency'),
                parameters.currency,
                null,
                engine,
                'flights',
                null,
                'TOTAL');

        flightGroup.fares = {
            fareDesc: {},
            fareSeats: (engine.parseFares(
                shopOption.find('SIG:FareInfo/SIG:Fares/SIG:Fare', engine.nsUri),
                parameters)),
            fareTotal: totalConverted
        };
        flightGroup.untouchable = filterFlightsUntouch(gds, carrier, profileConfig);

        solutions.push(flightGroup);
    };
    
    return solutions;
};

/**
 *
 * @param gds
 * @param carrier
 * @param config
 * @returns {boolean}
 */
let filterFlights = function (gds, carrier, config) {
    var len, i,
        deniedAirlines = config['denyAirlines'],
        allowedAirlines = config['allowAirlines'];
    if(allowedAirlines) {
        if(allowedAirlines.gdsList) {
            if(allowedAirlines.gdsList.indexOf(gds) === -1) { return false; }
        }
    }
    if(deniedAirlines) {
        if(deniedAirlines.pairGDSCarrier) {
            len = deniedAirlines.pairGDSCarrier.length;
            for(i = 0; i < len; i++) {
                if(gds == deniedAirlines.pairGDSCarrier[i].gds && deniedAirlines.pairGDSCarrier[i].carriers.indexOf(carrier) != -1) {
                    return false;
                }
            }
        }
    }
    return true;
};

/**
 *
 * @param gds
 * @param carrier
 * @param config
 * @returns {boolean}
 */
let filterFlightsUntouch = function (gds, carrier, config) {
    var len, i, untouchAirlines = config['untouchAirlines'];
    if(untouchAirlines) {
        if(untouchAirlines.pairGDSCarrier) {
            len = untouchAirlines.pairGDSCarrier.length;
            for(i = 0; i < len; i++) {
                if(gds == untouchAirlines.pairGDSCarrier[i].gds && untouchAirlines.pairGDSCarrier[i].carriers.indexOf(carrier) != -1) {
                    return true;
                }
            }
        }
    }
    return false;
};

/* Показываем маршруты с SIP только если они совместные с другими а\к */
let isCombinedFlight = function(airlines) {
    return airlines.split(' ').length > 1;
};

module.exports = TaisFlights;