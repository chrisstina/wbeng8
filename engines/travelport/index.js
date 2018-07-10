const rp = require('request-promise-native'),
    xmljs = require('libxmljs');

const basicEngine = require(__dirname + '/../../core/engine'),
    dictionaryManager = require(__dirname + '/../../core/dictionary/dictionary'),
    env = require('./../../utils/environment')(),
    scbsKit = require('../../utils/scbsKit');
//
// var xmljs = require('libxmljs'),
//     BasicProvider = require(__dirname + '/../../core/basicProvider.js'),
//     dictionaryManager = require(__dirname + '/../../core/dictionary/dictionary'),
//     extend = require('node.extend'),
//     clone = require('clone'),
//     Log = require('log'),
//     log = new Log();

const nsUri = {
    SOAP: 'http://schemas.xmlsoap.org/soap/envelope/',
    air: 'http://www.travelport.com/schema/air_v38_0',
    common_v38_0: 'http://www.travelport.com/schema/common_v38_0',
    universal: "http://www.travelport.com/schema/universal_v38_0"
};

const nsUriRequest = {
    'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
    'xmlns:com': 'http://www.travelport.com/schema/common_v38_0',
    'xmlns:air': 'http://www.travelport.com/schema/air_v38_0',
    'xmlns:univ': 'http://www.travelport.com/schema/universal_v38_0'
};

const gds = {
    '1G': 'GALILEO'
};

var TravelportEngine = function () {
};

TravelportEngine.prototype.basicEngine = basicEngine;
TravelportEngine.prototype.name = 'Travelport';
TravelportEngine.prototype.nsUri = nsUri;
TravelportEngine.prototype.dictionaryFOID = dictionaryManager(require(__dirname + '/../../core/dictionary/Travelport/documentsFOID'));
TravelportEngine.prototype.foidExceptionAirlines = ['TK', 'LH', 'J2', 'FB', 'OS', 'AI']; // Авиакомпании, при бронировании для которых нельзя указывать SSR:FOID
TravelportEngine.prototype.segmentsSeparator = '~';

TravelportEngine.prototype.passengerClass = {
    'ADULT': 'ADT',
    'YOUTH': 'YTH',
    'SENIOR': 'SRC',
    'CHILD': 'CNN',
    'INFANT': 'INF',
    'WSEATINFANT': 'INS',
    'ADT': 'ADULT',
    'YTH': 'YOUTH',
    'SRC': 'SENIOR',
    'CNN': 'CHILD',
    'INF': 'INFANT',
    'INS': 'WSEATINFANT'
};

TravelportEngine.prototype.getGDS = (code, defaultCode) => {
    if (defaultCode === undefined) {
        defaultCode = '';
    }
    return (gds[code] !== undefined) ? gds[code] : '';
};

TravelportEngine.prototype.wrapRequest = function (xmlRequestDocument, profileConfig) {
    var billingNode = new xmljs.Element(xmlRequestDocument, 'com:BillingPointOfSaleInfo').attr({OriginApplication: 'UAPI'});

    if (!xmlRequestDocument.root().attr('TargetBranch')) {
        xmlRequestDocument.root().attr({TargetBranch: profileConfig.pcc.bsp});
    }

    if (!xmlRequestDocument.root().attr('TraceId')) {
        xmlRequestDocument.root().attr({TargetBranch: profileConfig.pcc.bsp});
    }

    if (xmlRequestDocument.root().attr({AuthorizedBy: 'user'}).child(0)) {
        xmlRequestDocument.root().attr({AuthorizedBy: 'user'}).child(0).addPrevSibling(billingNode);
    } else {
        xmlRequestDocument.root().addChild(billingNode);
    }

    var xmlRequestWrapDocument = new xmljs.Document();

    xmlRequestWrapDocument
        .node('soapenv:Envelope')
            .attr(nsUriRequest)
            .node('soapenv:Header')
        .parent()
            .node('soapenv:Body')
        .addChild(xmlRequestDocument.root());

    return xmlRequestWrapDocument.toString();
};

/**
 *
 * @param requestBody
 * @param {function (xmlDoc, profileConfig, parameters) : Array} parseCallback  метод для парсинга ответа
 * @param profileConfig
 * @param parameters
 * @param endPoint
 */
TravelportEngine.prototype.request = function (requestBody, parseCallback, profileConfig, parameters, endPoint) {
    return basicEngine.request(
        profileConfig.connection.url + endPoint,
        {
            'Authorization': 'Basic ' + new Buffer( profileConfig.connection.username + ':' + profileConfig.connection.password).toString('base64'),
            'Content-Type': 'text/xml',
            'Host': profileConfig.connection.domain
        },
        requestBody,
        parseCallback,
        profileConfig,
        parameters
    );
};

/**
 *
 * @param d
 * @return {string}
 */
TravelportEngine.prototype.formatDate = function (d) {
    return d.getFullYear() + '-' +
        (d.getMonth() + 1).toString().replace(/^([0-9]{1})$/, '0$1') + '-' +
        (d.getDate()).toString().replace(/^([0-9]{1})$/, '0$1') + 'T' +
        d.toTimeString().replace(/ GMT.*/, '');
};

/**
 *
 * @param pi
 * @return {any[]}
 */
TravelportEngine.prototype.decodePricingInfos = function (pi) {
    return pi.split('|').map(function (AirPricingInfo) {
        AirPricingInfo = AirPricingInfo.split('~');
        return {
            Key: AirPricingInfo[0],
            PassengerTypeCode: AirPricingInfo[1].split('±'),
            fareInfos: AirPricingInfo[2].split('±').map(function (fareInfo) {
                fareInfo = fareInfo.split('§');
                return {
                    Key: fareInfo[0],
                    FareBasis: fareInfo[1],
                    EffectiveDate: fareInfo[2],
                    FareRuleKeys: (fareInfo[3]) ? fareInfo[3].split(',') : []
                };
            }),
            bookingInfos: AirPricingInfo[3].split('±').map(function (bookingInfo) {
                bookingInfo = bookingInfo.split('§');
                return {
                    BookingCode: bookingInfo[0],
                    FareInfoRef: bookingInfo[1],
                    SegmentRef: bookingInfo[2]
                };
            })
        };
    });// | ~ ± §
};

/**
 *
 * @param airFareInfo
 * @return {{}}
 */
TravelportEngine.prototype.getSegmDopInfo = function (airFareInfo) {
    var obj = {};
    obj.fareBasis = '';
    obj.baggage = '';
    obj.brandId = null;
    var banop = '', bamw = '';
    if (airFareInfo !== undefined) {
        obj.fareBasis = this.getNodeAttr(airFareInfo, 'FareBasis');
        obj.brandId = this.getNodeAttr(airFareInfo.get('air:Brand', this.nsUri), 'BrandID');
        banop = airFareInfo.get('air:BaggageAllowance/air:NumberOfPieces', this.nsUri);
        banop = (banop) ? banop.text() : '';
        bamw = airFareInfo.get('air:BaggageAllowance/air:MaxWeight', this.nsUri);
        if (bamw) {
            var unit = (bamw.attr('Unit')) ? bamw.attr('Unit').value() : '';
            if (unit == 'Kilograms') {
                unit = 'KG';
            }
            var v = (bamw.attr('Value')) ? bamw.attr('Value').value() : '';
            bamw = '' + v + unit;
        } else {
            bamw = '';
        }
        if (banop) {
            obj.baggage = '' + banop + 'PC';
        } else if (bamw) {
            obj.baggage = bamw;
        }
    }
    return obj;
};

/**
 *
 * @param airSegment
 * @return {string}
 */
TravelportEngine.prototype.encodeSegment = function (airSegment) {
    return airSegment.attr('Key').value() + '|' +
        airSegment.attr('Group').value() + '|' +
        airSegment.attr('Carrier').value() + '|' +
        airSegment.attr('FlightNumber').value() + '|' +
        airSegment.attr('Origin').value() + '|' +
        airSegment.attr('Destination').value() + '|' +
        airSegment.attr('DepartureTime').value() + '|' +
        airSegment.attr('ArrivalTime').value() + '|' +
        ((airSegment.attr('FareBasis') !== undefined && airSegment.attr('FareBasis') !== null) ?
            airSegment.attr('FareBasis').value() : '') + '|' +
        ((airSegment.attr('BookingCode') !== undefined && airSegment.attr('BookingCode') !== null) ?
            airSegment.attr('BookingCode').value() : '') + '|' +
        ((airSegment.attr('BrandId') !== undefined && airSegment.attr('BrandId') !== null && airSegment.attr('BrandId').value()) ?
            airSegment.attr('BrandId').value() : '');
};

TravelportEngine.prototype.decodeSegment = function (airSegment) {
    var k = 0;
    airSegment = airSegment.split('|');
    airSegment = {
        Key: airSegment[k++],
        Group: airSegment[k++],
        Carrier: airSegment[k++],
        FlightNumber: airSegment[k++],
        Origin: airSegment[k++],
        Destination: airSegment[k++],
        DepartureTime: airSegment[k++],
        ArrivalTime: airSegment[k++],
        FareBasis: airSegment[k++],
        BookingCode: airSegment[k++],
        BrandId: airSegment[k++],
        Connection: parseInt(airSegment[k++])
    };

    if (airSegment.FareBasis === 'undefined' || airSegment.FareBasis === undefined) {
        delete airSegment.FareBasis;
    }
    if (airSegment.BookingCode === 'undefined' || airSegment.BookingCode === undefined) {
        delete airSegment.BookingCode;
    }
    if (airSegment.BrandId === 'false' || airSegment.BrandId === undefined) {
        delete airSegment.BrandId;
    }
    return airSegment;
};

TravelportEngine.prototype.getNodeAttr = function (node, attr, attr2) {
    return (node && node.attr(attr) ? node.attr(attr).value() : (attr2 && node.attr(attr2) ? node.attr(attr2).value() : false));
};

TravelportEngine.prototype.parsePrice = function (price) {
    var found = price.match(/([A-Z]{3})([0-9]+)/);
    return parseInt(found[2]);

    /*
     if (found[1] === 'RUB') {
     return parseInt(found[2]);
     }

     return {
     currency: found[1],
     amount: parseInt(found[2])
     };
     */
};


/**
 * Возвращает бонусный код для а\к. Если кодов заведено несколько, выбирает случайный
 *
 * @param {type} carrierCode
 * @param {type} config
 * @returns {String}
 */
TravelportEngine.prototype.getBenefitCode = function (carrierCode, config) {
    var codes = config.benefitCodes[carrierCode], code = '';
    if (carrierCode === undefined || codes === undefined) {
        code = '';
    }

    if (Array.isArray(codes)) {
        code = codes[Math.floor(Math.random() * (codes.length))];
        log.info('Used %s benefit code %s', carrierCode, code);
    } else {
        code = codes;
        log.info('Used %s benefit code %s', carrierCode, code);
    }

    return code;
};

module.exports = new TravelportEngine();