const provider = require('../index'),
    scbsKit = require('../../../utils/scbsKit'),
    tokenCrypt = require('./../../../core/tokenCrypt');

const xmljs = require('libxmljs');

var engine;

var PortbiletFlights = function (operationEngine) {
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
PortbiletFlights.prototype.execute = function (context, parameters, profileConfig) {
    console.info('Токен запроса PB %s', context.WBtoken);
    console.time("Portbilet flights executed in");

    return getFlights(profileConfig, parameters)
        .then((flightsList) => {
            return flightsList;
        })
        .catch((err) => {
            console.timeEnd("Portbilet flights executed in");
            throw err; // далее эта ошибка обработается в routes.js
        });
};

let getFlights = function (profileConfig, parameters) {
    let xmlBody = buildFlightsRequest(parameters);
    let xmlRequest = provider.wrapRequest(xmlBody, profileConfig);
    return provider.request(xmlRequest, parseFlightsResponse, profileConfig, parameters);
};

let buildFlightsRequest = function (parameters) {
    var xmlRequestDocument = new xmljs.Document(),
        cursor,
        i;
    cursor = xmlRequestDocument
        .node('ns1:searchFlights')
        .node('parameters')
        .node('eticketsOnly').text(parameters.eticketsOnly ? "true" : "false")
        .parent()
        .node('mixedVendors').text(parameters.eticketsOnly ? "true" : "false")
        .parent();

    cursor = cursor.node('preferredAirlines');
    if (parameters.preferredAirlines.length !== 0) {
        for (i = 0; i < parameters.preferredAirlines.length; i++) {
            cursor = cursor
                .node('airline')
                .node('code').text(parameters.preferredAirlines[i].code).parent()
                .node('name').text(parameters.preferredAirlines[i].name).parent()
                .parent();
        }
    }
    cursor = cursor.parent(); // preferredAirlines

    cursor = cursor
        .node('route');

    for (i = 0; i < parameters.route.length; i++) {
        cursor = cursor
            .node('segment')
            .node('date').text(parameters.route[i].date)
            .parent()
            .node('locationBegin')
            .node('code').text(parameters.route[i].locationBegin.code)
            .parent()
            .node('name').text(parameters.route[i].locationBegin.name)
            .parent()
            .parent()
            .node('locationEnd')
            .node('code').text(parameters.route[i].locationEnd.code)
            .parent()
            .node('name').text(parameters.route[i].locationEnd.name)
            .parent()
            .parent()
            .parent();
    }

    cursor = cursor
        .parent()
        .node('seats');

    for (i = 0; i < parameters.seats.length; i++) {
        cursor = cursor
            .node('seatPreferences')
            .node('count').text(parameters.seats[i].count)
            .parent()
            .node('passengerType').text(provider.codeToPTC(parameters.seats[i].passengerType))
            .parent()
            .parent();
    }

    cursor = cursor
        .parent()
        .node('serviceClass').text(parameters.serviceClass)
        .parent()
        .node('skipConnected').text(parameters.skipConnected ? "true" : "false");

    return xmlRequestDocument;
};

let parseFlightsResponse = function (xmlDoc, profileConfig, parameters) {
    if (xmlDoc['find'] == undefined) {
        throw new Error('xmlDoc has no method find');
    }
    var flights = xmlDoc.find('//flight', provider.nsUri),
        solutions = [],
        carrier, gds, Itinar;

    // Цикл по всем полётам в выдаче
    for (var i = 0; i < flights.length; i++) {

        gds = flights[i].get('gds', provider.nsUri).text();
        carrier = provider.parseCodeNamePair(flights[i].get('carrier'));

        if (gds === 'SIRENA') {
            continue;
        }

        if (profileConfig.denyAirlines && profileConfig.denyAirlines.length > 0 && profileConfig.denyAirlines.indexOf(carrier.code) > -1) {
            continue;
        }
        if (profileConfig.allowAirlines && profileConfig.allowAirlines.length > 0) {
            if (profileConfig.allowAirlines.indexOf(carrier.code) > -1) {
            }
            else {
                continue;
            }
        }
        Itinar = flights[i].find('segments/segment', provider.nsUri);

        var flightGroup = scbsKit.getFlightGroup();

        flightGroup.token = tokenCrypt.encode({
            provider: profileConfig.providerSettings.code,
            flightToken: flights[i].get('token', provider.nsUri).text(),
            latinRegistration: (flights[i].get('latinRegistration', provider.nsUri).text() === 'true'),
            seats: parameters.seats
        });

        flightGroup.provider = profileConfig.providerSettings.code;
        flightGroup.carrier = carrier;
        flightGroup.eticket = (flights[i].get('eticket', provider.nsUri).text() === 'true');
        flightGroup.latinRegistration = (flights[i].get('latinRegistration', provider.nsUri).text() === 'true');
        flightGroup.timeLimit = provider.getNodeText(flights[i], 'timeLimit');
        flightGroup.gds = flights[i].get('gds', provider.nsUri).text() === 'SOAP_SIG' ? 'SIG' : flights[i].get('gds', provider.nsUri).text();
        flightGroup.itineraries = provider.parseItineraries(Itinar);
        flightGroup.fares = provider.parseFares(flights[i].find('price/price', provider.nsUri), parameters.seats, Itinar.length, profileConfig);
        solutions.push(flightGroup);
    }
    // Цикл по всем полётам в выдаче
    return solutions;
};

module.exports = PortbiletFlights;