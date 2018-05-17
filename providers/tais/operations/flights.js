const basicProvider = new require('./../../../core/provider')(),
    currency = require('../../../utils/scbsCurrency'),
    customTax = require('../../../utils/scbsCustomTax'),
    provider = require('./../tais'),
    scbsKit = require('../../../utils/scbsKit'),
    tokenCrypt = require('./../../../core/tokenCrypt');

const xmljs = require('libxmljs');

var TaisFlights = function () {
};

/**
 * Цепочка запросов для поиска вариантов перелета
 *
 * @param {type} context
 * @param {type} parameters
 * @param {type} profileConfig
 * @returns {Promise}
 */
TaisFlights.prototype.execute = function (context, parameters, profileConfig) {
    console.info('Токен запроса %s', context.WBtoken);
    console.time("TAIS flights executed in");

    return getFlights(profileConfig, parameters)
        .then((flightsList) => {
            return flightsList;
        })
        .catch((err) => {
            console.timeEnd("TAIS flights executed in");
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
    let xmlRequest = provider.wrapRequest(xmlBody, profileConfig);
    return provider.request(xmlRequest, parseFlightsResponse, profileConfig, parameters);
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
                .attr(provider.getPaxPair(seat.passengerType))
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
    let shopOptions = xmlDoc.find('//SIG:ShopOption', provider.nsUri),
        sessionID = basicProvider.getNodeAttr(xmlDoc.get('//SIG:SIG_AirShopRS', provider.nsUri), 'SessionID'),
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
            needIgnore = needIgnore || (provider.ignoredLocations.indexOf(leg.locationBegin.code)!== -1 ||
                provider.ignoredLocations.indexOf(leg.locationEnd.code)!== -1);
        });
    }

    for (var i = 0; i < shopOptions.length; i++) {
        let shopOption = shopOptions[i], ruleKeysDesc = [];

        carrier = shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', provider.nsUri).attr('ValidatingCarrier') ?
            shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', provider.nsUri).attr('ValidatingCarrier').value() :
            shopOption.get('SIG:ItineraryOptions/SIG:ItineraryOption/SIG:FlightSegment', provider.nsUri).attr('Airline').value();

        gds = provider.getGDS(shopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:TicketStock', provider.nsUri).attr('CRS').value());

        // фильтруем по а\к
        if( ! filterFlights(gds, carrier, profileConfig)) {
            continue;
        }

        // фильтруем Симферополь- только стыковочные
        if (needIgnore && ! isCombinedFlight(shopOption.attr('Airlines').value())) {
            continue;
        }

        shopOptionID = basicProvider.getNodeAttr(shopOption, 'OptionRef');
        ruleKeys = shopOption.find('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:Rules/SIG:RuleKey', provider.nsUri);

        ruleKeys.map((key, index) => {
            ruleKeysDesc[index] = key.text();
        });

        let flightGroup = scbsKit.getFlightGroup();
        flightGroup.token = tokenCrypt.encode({
            provider: provider.code,
            seats: parameters.seats,
            route: parameters.route,
            code: sessionID + '|' + shopOptionID,
            rules: ruleKeysDesc.join('§'),
            gds: gds
        });
        flightGroup.provider = provider.code;
        flightGroup.carrier = { code: carrier };
        flightGroup.eticket = (shopOption.get('SIG:FareInfo/SIG:Ticketing', provider.nsUri).attr('eTicket').value() === 'true');
        flightGroup.timeLimit = shopOption.get('SIG:FareInfo/SIG:Ticketing', provider.nsUri).attr('TimeLimit').value();
        flightGroup.latinRegistration = (shopOption.get('SIG:BookingGuidelines', provider.nsUri).attr('RussianNamesSupported') !== 'true');
        flightGroup.gds = gds;
        flightGroup.itineraries = provider.parseItineraries(
            shopOption.find('SIG:ItineraryOptions/SIG:ItineraryOption', provider.nsUri),
            sessionID,
            shopOptionID,
            shopOption);

        let totalConverted = currency.convertAmount(
                parseFloat(basicProvider.getNodeAttr(shopOption, 'Total')),
                basicProvider.getNodeAttr(shopOption, 'Currency'),
                parameters.currency,
                null,
                provider,
                'flights',
                null,
                'TOTAL'),
            zzTaxes = customTax.getCustomTaxes(profileConfig, totalConverted),
            fareTotalWithZZ = customTax.getTotalWithCustomTaxes(zzTaxes, totalConverted);

        flightGroup.fares = {
            fareDesc: {},
            fareSeats: (provider.parseFares(
                shopOption.find('SIG:FareInfo/SIG:Fares/SIG:Fare', provider.nsUri),
                zzTaxes,
                parameters)),
            fareTotal: fareTotalWithZZ
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

module.exports = new TaisFlights();