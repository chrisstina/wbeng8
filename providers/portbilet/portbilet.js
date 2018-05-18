const rp = require('request-promise-native'),
    xmljs = require('libxmljs');

const basicProvider = new require('./../../core/provider')(),
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

var PortbiletProvider = function () {
};

PortbiletProvider.prototype.nsUri = nsUri;

PortbiletProvider.prototype.wrapRequest = (xmlBody, profileConfig) => {
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
PortbiletProvider.prototype.request = function (requestBody, parseCallback, profileConfig, parameters, requestHeaders = {}) {
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

PortbiletProvider.prototype.parsePassenger = function (passengerNode) {
    return {
        passport: {
            firstName: basicProvider.getNodeText(passengerNode, 'passport/firstName'),
            lastName: basicProvider.getNodeText(passengerNode, 'passport/lastName'),
            middleName: basicProvider.getNodeText(passengerNode, 'passport/middleName'),
            citizenship: {
                code: basicProvider.getNodeText(passengerNode, 'passport/citizenship/code'),
                name: basicProvider.getNodeText(passengerNode, 'passport/citizenship/name')
            },
            issued: basicProvider.getNodeText(passengerNode, 'passport/issued'),
            expired: basicProvider.getNodeText(passengerNode, 'passport/expired'),
            number: basicProvider.getNodeText(passengerNode, 'passport/number'),
            type: basicProvider.getNodeText(passengerNode, 'passport/type'),
            birthday: basicProvider.getNodeText(passengerNode, 'passport/birthday'),
            gender: basicProvider.getNodeText(passengerNode, 'passport/gender')
        },
        type: basicProvider.getNodeText(passengerNode, 'type'),
        phoneType: basicProvider.getNodeText(passengerNode, 'phoneType'),
        phoneNumber: basicProvider.getNodeText(passengerNode, 'phoneNumber'),
        countryCode: basicProvider.getNodeText(passengerNode, 'countryCode'),
        areaCode: basicProvider.getNodeText(passengerNode, 'areaCode')
    };
};

PortbiletProvider.prototype.parseCodeNamePair = function (codeNameNode) {
    return {
        code: basicProvider.getNodeText(codeNameNode, 'code'),
        name: basicProvider.getNodeText(codeNameNode, 'name')
    }
};

PortbiletProvider.prototype.getNodeText = function (node, text) {
    return (node && node.get(text) ? node.get(text).text() : '');
};

PortbiletProvider.prototype.parseItineraries = function (segmentNodes) {
    var itineraries = [],
        k = -1;
    for (var j = 0; j < segmentNodes.length; j++) {
        if ((j === 0) || (basicProvider.getNodeText(segmentNodes[j], 'starting') === 'true')) {
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
            token: basicProvider.getNodeText(segmentNodes[j].get('fareInfos/fareInfos'), 'remarksSearchContext'),
            serviceClass: translit.transliterate(basicProvider.getNodeText(segmentNodes[j], 'serviceClass')),
            bookingClass: translit.transliterate(basicProvider.getNodeText(segmentNodes[j], 'bookingClass')),
            flightNumber: basicProvider.getNodeText(segmentNodes[j], 'flightNumber'),
            travelDuration: basicProvider.getNodeText(segmentNodes[j], 'travelDuration'),
            regLocator: basicProvider.getNodeText(segmentNodes[j], 'airlineLocator'),
            carrier: this.parseCodeNamePair(segmentNodes[j].get('airline')),
            equipment: this.parseCodeNamePair(segmentNodes[j].get('board')),
            locationBegin: this.parseCodeNamePair(segmentNodes[j].get('locationBegin')),
            cityBegin: this.parseCodeNamePair(segmentNodes[j].get('cityBegin')),
            countryBegin: this.parseCodeNamePair(segmentNodes[j].get('countryBegin')),
            locationEnd: this.parseCodeNamePair(segmentNodes[j].get('locationEnd')),
            cityEnd: this.parseCodeNamePair(segmentNodes[j].get('cityEnd')),
            countryEnd: this.parseCodeNamePair(segmentNodes[j].get('countryEnd')),
            dateBegin: basicProvider.getNodeText(segmentNodes[j], 'dateBegin'),
            dateEnd: basicProvider.getNodeText(segmentNodes[j], 'dateEnd'),
            terminalBegin: basicProvider.getNodeText(segmentNodes[j], 'terminalBegin'),
            terminalEnd: basicProvider.getNodeText(segmentNodes[j], 'terminalEnd'),
            fareBasis: basicProvider.getNodeText(segmentNodes[j].get('fareInfos/fareInfos'), 'fareBasis'),
            methLocomotion: 'AVIA',
            baggage: {
                type: '',
                allow: '',
                value: basicProvider.getNodeText(segmentNodes[j], 'baggageWeightLimit')
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

PortbiletProvider.prototype.codeToPTC = function (code) {
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

PortbiletProvider.prototype.parseFares = function (priceNodes, seats, numseg, config) {
    var fareSeatCodes = [],
        fareSeats = [],
        fareTotal = 0;

    for (var j = 0; j < priceNodes.length; j++) {
        var ptc = PortbiletProvider.prototype.codeToPTC(basicProvider.getNodeText(priceNodes[j], 'passengerType'));
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
            elementType: basicProvider.getNodeText(priceNodes[j], 'elementType'),
            amount: parseInt(basicProvider.getNodeText(priceNodes[j], 'amount'))
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
    return basicProvider.parse(parseCallback, body, profileConfig, parameters, parseError);
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

module.exports = new PortbiletProvider();