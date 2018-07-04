const rp = require('request-promise-native'),
    xmljs = require('libxmljs');

const basicEngine = require('./../../core/engine'),
    customTax = require('../../utils/scbsCustomTax'),
    translit = require('transliteration.cyr');

const nsUri = {
    'xmlns:S': 'http://schemas.xmlsoap.org/soap/envelope/',
    'xmlns:ns2': 'http://ws2.vip.server.xtrip.gridnine.com/'
};

const nsUriRequest = {
    'xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xmlns:ns1': 'http://ws2.vip.server.xtrip.gridnine.com/'
};

var PortbiletEngine = function () {
};

PortbiletEngine.prototype.basicEngine = basicEngine;
PortbiletEngine.prototype.nsUri = nsUri;

PortbiletEngine.prototype.wrapRequest = (xmlBody, profileConfig) => {
    xmlBody.root()
        .node('context')
        .node('locale').text('en')
        .parent()
        .node('loginName').text(profileConfig.connection.username)
        .parent()
        .node('password').text(profileConfig.connection.password)
        .parent()
        .node('salesPointCode').text(profileConfig.connection.salesPointCode);

    let xmlRequestWrapDocument = new xmljs.Document();

    xmlRequestWrapDocument
        .node('SOAP-ENV:Envelope').attr(nsUriRequest)
        .node('SOAP-ENV:Body')
        .addChild(xmlBody.root());

    return xmlRequestWrapDocument.toString();
};

/**
 *
 * @param requestBody
 * @param transformCallback  метод для парсинга ответа
 * @param profileConfig
 * @param parameters
 * @param requestHeaders
 * @returns Request
 */
PortbiletEngine.prototype.request = function (requestBody, parseCallback, profileConfig, parameters, requestHeaders = {}) {
    const headers = {
        'Content-Type': 'text/xml',
        'Domain': profileConfig.connection.domain
    };

    const requestOptions = {
        method: "POST",
        uri: profileConfig.connection.url,
        headers: Object.assign(requestHeaders, headers),
        body: requestBody,
        transform: (body, response, resolveWithFullResponse) => { // оборачиваем метод трансформации, чтобы были видны parameters и profileConfig
            return parse(parseCallback, body, profileConfig, parameters);
        }
    };

    console.log(requestBody); // @todo вывод в файл

    return rp.post(requestOptions);
};

PortbiletEngine.prototype.parsePassenger = function (passengerNode) {
    return {
        passport: {
            firstName: basicEngine.getNodeText(passengerNode, 'passport/firstName'),
            lastName: basicEngine.getNodeText(passengerNode, 'passport/lastName'),
            middleName: basicEngine.getNodeText(passengerNode, 'passport/middleName'),
            citizenship: {
                code: basicEngine.getNodeText(passengerNode, 'passport/citizenship/code'),
                name: basicEngine.getNodeText(passengerNode, 'passport/citizenship/name')
            },
            issued: basicEngine.getNodeText(passengerNode, 'passport/issued'),
            expired: basicEngine.getNodeText(passengerNode, 'passport/expired'),
            number: basicEngine.getNodeText(passengerNode, 'passport/number'),
            type: basicEngine.getNodeText(passengerNode, 'passport/type'),
            birthday: basicEngine.getNodeText(passengerNode, 'passport/birthday'),
            gender: basicEngine.getNodeText(passengerNode, 'passport/gender')
        },
        type: basicEngine.getNodeText(passengerNode, 'type'),
        phoneType: basicEngine.getNodeText(passengerNode, 'phoneType'),
        phoneNumber: basicEngine.getNodeText(passengerNode, 'phoneNumber'),
        countryCode: basicEngine.getNodeText(passengerNode, 'countryCode'),
        areaCode: basicEngine.getNodeText(passengerNode, 'areaCode')
    };
};

PortbiletEngine.prototype.parseCodeNamePair = function (codeNameNode) {
    return {
        code: basicEngine.getNodeText(codeNameNode, 'code'),
        name: basicEngine.getNodeText(codeNameNode, 'name')
    }
};

PortbiletEngine.prototype.getNodeText = function (node, text) {
    return (node && node.get(text) ? node.get(text).text() : '');
};

PortbiletEngine.prototype.parseItineraries = function (segmentNodes) {
    var itineraries = [],
        k = -1;
    for (var j = 0; j < segmentNodes.length; j++) {
        if ((j === 0) || (basicEngine.getNodeText(segmentNodes[j], 'starting') === 'true')) {
            itineraries[++k] = {
                token: "-",
                flights: [
                    {
                        token: "-",
                        segments: []
                    }
                ]
            };
        }
        var segm = {
            token: basicEngine.getNodeText(segmentNodes[j].get('fareInfos/fareInfos'), 'remarksSearchContext'),
            serviceClass: translit.transliterate(basicEngine.getNodeText(segmentNodes[j], 'serviceClass')),
            bookingClass: translit.transliterate(basicEngine.getNodeText(segmentNodes[j], 'bookingClass')),
            flightNumber: basicEngine.getNodeText(segmentNodes[j], 'flightNumber'),
            travelDuration: basicEngine.getNodeText(segmentNodes[j], 'travelDuration'),
            regLocator: basicEngine.getNodeText(segmentNodes[j], 'airlineLocator'),
            carrier: this.parseCodeNamePair(segmentNodes[j].get('airline')),
            equipment: this.parseCodeNamePair(segmentNodes[j].get('board')),
            locationBegin: this.parseCodeNamePair(segmentNodes[j].get('locationBegin')),
            cityBegin: this.parseCodeNamePair(segmentNodes[j].get('cityBegin')),
            countryBegin: this.parseCodeNamePair(segmentNodes[j].get('countryBegin')),
            locationEnd: this.parseCodeNamePair(segmentNodes[j].get('locationEnd')),
            cityEnd: this.parseCodeNamePair(segmentNodes[j].get('cityEnd')),
            countryEnd: this.parseCodeNamePair(segmentNodes[j].get('countryEnd')),
            dateBegin: basicEngine.getNodeText(segmentNodes[j], 'dateBegin'),
            dateEnd: basicEngine.getNodeText(segmentNodes[j], 'dateEnd'),
            terminalBegin: basicEngine.getNodeText(segmentNodes[j], 'terminalBegin'),
            terminalEnd: basicEngine.getNodeText(segmentNodes[j], 'terminalEnd'),
            fareBasis: basicEngine.getNodeText(segmentNodes[j].get('fareInfos/fareInfos'), 'fareBasis'),
            methLocomotion: 'AVIA',
            baggage: {
                type: '',
                allow: '',
                value: basicEngine.getNodeText(segmentNodes[j], 'baggageWeightLimit')
            }
        };
        if(segm.baggage.value) {
            var sb = segm.baggage.value;
            if(/^[0-9]{1,2}P$/.test(sb)) {
                var sa = parseInt(sb.slice(0, -1)) + 'PC';
                segm.baggage.value = sa;
            }
        }
        itineraries[k].flights[0].segments.push(segm);
    }
    return itineraries;
};

PortbiletEngine.prototype.codeToPTC = function (code) {
    switch (code) {
        case 'ADULT':
        case 'YOUTH':
        case 'SENIOR':
        case 'CHILD':
        case 'INFANT':
            return code;
            break;
        case 'WSEATINFANT':
            return 'INFANT_WITH_SITE';
            break;
        case 'INFANT_WITH_SITE':
            return 'WSEATINFANT';
            break;
    }
};

PortbiletEngine.prototype.parseFares = function (priceNodes, seats, numseg, config) {
    var fareSeatCodes = [],
        fareSeats = [],
        fareTotal = 0;

    for (var j = 0; j < priceNodes.length; j++) {
        var ptc = PortbiletEngine.prototype.codeToPTC(basicEngine.getNodeText(priceNodes[j], 'passengerType'));
        if (!fareSeatCodes.hasOwnProperty(ptc)) {
            k = Object.keys(fareSeatCodes).length;
            fareSeatCodes[ptc] = k;
            fareSeats[k] = {
                passengerType: ptc,
                count: (function (passengerType) {
                    for (var i = 0; i < seats.length; i++) {
                        if (seats[i].passengerType === passengerType) {
                            return seats[i].count;
                        }
                    }
                    return -1;
                }(ptc)),
                prices: []
            };
        } else {
            k = fareSeatCodes[ptc];
        }

        fareSeats[k].prices.push({
            elementType: basicEngine.getNodeText(priceNodes[j], 'elementType'),
            amount: parseInt(basicEngine.getNodeText(priceNodes[j], 'amount'))
        });

        fareTotal += parseInt(fareSeats[k].count) * parseInt(priceNodes[j].get('amount').text());
    }

    // ������� ����� ZZ
    if(config.addZZTax) {
        var cnt = fareSeats.length;
        var amt = 0;
        for(i = 0; i < cnt; i++) {
            if(fareSeats[i].passengerType != 'INFANT') {
                amt = config.addZZTax * numseg;
                fareSeats[i].prices.push({
                    elementType: 'FEE',
                    code: 'TT-ZZ',
                    amount: amt
                });
                fareTotal += amt * fareSeats[i].count;
            }
        }
    }

    for (var fareIdx in fareSeats) {
        var zzTaxes = customTax.getCustomTaxes(config, fareTotal);
        fareSeats[fareIdx].prices = fareSeats[fareIdx].prices.concat(zzTaxes);
    }

    var fareTotalWithZZ = customTax.getTotalWithCustomTaxes(zzTaxes, fareTotal, fareSeats.length);
    return {
        fareDesc: {},
        fareSeats: fareSeats,
        fareTotal: fareTotalWithZZ
    };
};


/**
 * Распарсивает XML ответ в нужную структуру.
 * Дополнительно проверяем на наличие ошибок.
 * Логируем. @todo логирование нормальное и вынести в общий модуль
 *
 * @param parseCallback
 * @param body
 * @param profileConfig
 * @param parameters
 * @returns {*}
 */
let parse = (parseCallback, body, profileConfig, parameters) => {
    return basicEngine.parse(parseCallback, body, profileConfig, parameters, parseError);
};

let parseError = function (xmlDoc) {
    var messages = [];
    xmlDoc.find('//messages/message').map(function (message) {
        return message.get('message').text(); // @todo убрать это, когда будет обработка messages
        // messages.push({
        //     type: message.get('type').text(),
        //     message: message.get('message').text()
        // });
    })

    return '';
}

module.exports = new PortbiletEngine();