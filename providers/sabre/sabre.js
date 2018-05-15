const errors = require('restify-errors'),
    rp = require('request-promise-native'),
    xmljs = require('libxmljs');

/** @todo можно запихнуть в модуль config (экспортить настройки) */

const nsUri = {
    'soap-env': 'http://schemas.xmlsoap.org/soap/envelope/',
    'm': 'http://www.ebxml.org/namespaces/messageHeader',
    'xlink': 'http://www.w3.org/1999/xlink',
    'xsd': 'http://www.w3.org/1999/XMLSchema',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'wsse': 'http://schemas.xmlsoap.org/ws/2002/12/secext',
    'eb': 'http://www.ebxml.org/namespaces/messageHeader',
    'pl': 'http://services.sabre.com/STL_Payload/v02_01',
    'wsu': 'http://schemas.xmlsoap.org/ws/2002/12/utility',
    'R': 'http://www.opentravel.org/OTA/2003/05',
    'eab': 'http://services.sabre.com/sp/eab/v3_9',
    'pd': 'http://services.sabre.com/sp/pd/v3_3',
    'tir': 'http://services.sabre.com/res/tir/v3_6',
    'tir39': 'http://services.sabre.com/res/tir/v3_9',
    'c': 'http://webservices.sabre.com/sabreXML/2011/10',
    'stl': 'http://services.sabre.com/STL/v01',
    'stl16': 'http://webservices.sabre.com/pnrbuilder/v1_16',
    'nopnr':'http://webservices.sabre.com/sabreXML/2003/07'
};

const XMLTemplate =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eb="http://www.ebxml.org/namespaces/messageHeader" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsd="http://www.w3.org/1999/XMLSchema">' +
    '<SOAP-ENV:Header>' +
    '<eb:MessageHeader SOAP-ENV:mustUnderstand="1" eb:version="1.0">' +
    '<eb:ConversationId>wbeng</eb:ConversationId>' +
    '<eb:From>' +
    '<eb:PartyId type="urn:x12.org:IO5:01">Agency</eb:PartyId>' +
    '</eb:From>' +
    '<eb:To>' +
    '<eb:PartyId type="urn:x12.org:IO5:01">SWS</eb:PartyId>' +
    '</eb:To>' +
    '<eb:Service eb:type="sabreXML"></eb:Service>' +
    '<eb:Action></eb:Action>' +
    '<eb:MessageData>' +
    '<eb:MessageId></eb:MessageId>' +
    '<eb:Timestamp></eb:Timestamp>' +
    '</eb:MessageData>' +
    '</eb:MessageHeader>' +
    '<wsse:Security xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext"></wsse:Security>' +
    '</SOAP-ENV:Header>' +
    '<SOAP-ENV:Body></SOAP-ENV:Body>' +
    '</SOAP-ENV:Envelope>';

const requestTimeout = 100000;

var SabreProvider = function () {
};

/**
 * Распарсивает XML ответ в нужную структуру.
 * Дополнительно проверяем на наличие ошибок.
 *
 * @param parseCallback
 * @param body
 * @param profileConfig
 * @param parameters
 * @returns {*}
 */
let parse = (parseCallback, body, profileConfig, parameters) => {
    let xmlDoc = xmljs.parseXml(body);
    let errorText = parseError(xmlDoc);

    if (errorText !== '') {
        throw new Error('GDS вернула ошибку ' + errorText);
    }

    return parseCallback(xmlDoc, profileConfig, parameters);
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
SabreProvider.prototype.request = function (requestBody, parseCallback, profileConfig, parameters, requestHeaders = {}) {
    const headers = {
        'Content-Type': 'text/xml',
        'Domain': profileConfig.connection.domain
    };

    const requestOptions = {
        method: "POST",
        uri: profileConfig.connection.url,
        headers: Object.assign(requestHeaders, headers),
        body: requestBody,
        timeout: requestTimeout,
        transform: (body, response, resolveWithFullResponse) => { // оборачиваем метод трансформации, чтобы были видны parameters и profileConfig
            return parse(parseCallback, body, response, resolveWithFullResponse);
        }
    };

    console.log(requestBody); // @todo вывод в файл

    return rp.post(requestOptions);
};

/**
 * @param {type} xmlBody
 * @param {type} profile
 * @param {type} serviceName
 * @param {type} actionName
 * @param {type} sessionToken
 * @returns Promise
 */
SabreProvider.prototype.buildRequest = function (xmlBody, profileConfig, serviceName, actionName, sessionToken = null) {
    var xmlDoc = xmljs.parseXml(XMLTemplate);

    if (sessionToken === null) { // открываем сессию
        xmlDoc.get('//wsse:Security', nsUri).addChild(getUsernameToken(profileConfig));
    } else { // передаем токен
        (xmlDoc.get('//wsse:Security', nsUri).child(0)
            || xmlDoc.get('//wsse:Security', nsUri).node('wsse:BinarySecurityToken')).text(sessionToken);
    }

    if (serviceName !== undefined) {
        xmlDoc.get('//eb:Service', nsUri).text(serviceName);
    }

    if (serviceName !== undefined) {
        xmlDoc.get('//eb:Action', nsUri).text(actionName);
    }

    if (xmlBody.root()) {
        xmlDoc.get('//soap-env:Body', nsUri).addChild(xmlBody.root());
    }

    return xmlDoc.toString();
};

SabreProvider.prototype.nsUri = nsUri;

/*
* <!-- "Cabin" (optional) Cabin for this leg or segment. -->
<!--
Cabin="P" or Cabin="PremiumFirst" is a Premium First class cabin.
-->
<!-- Cabin="F" or Cabin="First" is a First class cabin. -->
<!--
Cabin="J" or Cabin="PremiumBusiness" is a Premium Business class cabin.
-->
<!--
Cabin="C" or Cabin="Business" is a Business class cabin.
-->
<!--
Cabin="S" or Cabin="PremiumEconomy" is a Premium Economy class cabin.
-->
<!--
Cabin="Y" or Cabin="Economy" is a Economy class cabin.
-->
*/
SabreProvider.prototype.serviceClass = {
    'FIRST': 'F',
    'PREMIUMBUSINESS': 'J',
    'BUSINESS': 'C',
    'PREMIUMECONOMY': 'S',
    'ECONOMY': 'Y'
};

SabreProvider.prototype.seatCode = function (code) {
    switch (code) {
        case 'ADULT':
            return 'ADT';
            break;
        case 'CHILD':
            return 'CNN';
            break;
        case 'INFANT':   // младенец без места
            return 'INF';
            break;
        case 'WSEATINFANT': // младенец с местом
            return 'INS';
            break;
        case 'YOUTH':
            return 'YTH';
            break;
        case 'SENIOR':
            return 'SRC';
            break;
        case 'ADT':
            return 'ADULT';
            break;
        case 'CNN':
            return 'CHILD';
            break;
        case 'INF':  // младенец без места
            return 'INFANT';
            break;
        case 'INS':
            return 'WSEATINFANT'; // младенец с местом
            break;
        case 'YTH':
            return 'YOUTH';
            break;
        case 'SRC':
            return 'SENIOR';
            break;
    }
};

SabreProvider.prototype.passengerTypes = {
    adult: {title: "ADULT", ssrType: "DOCS"},
    child: {title: "CHILD", ssrType: "DOCS"},
    youth: {title: "YOUTH", ssrType: "DOCS"},
    senior: {title: "SENIOR", ssrType: "DOCS"},
    infant: {title: "INFANT", ssrType: "INFT"},
    infantseat: {title: "WSEATINFANT", ssrType: "DOCS"}
};

/**
 * Берет занчение часового пояса из настроек.
 * По-умолчанию калининградский часовой пояс.
 * @param {type} config
 * @returns {configtimezones.bspCommon|String}
 */
SabreProvider.prototype.getPCCTimezone = function (config) {
    if (config.timezones !== undefined) {
        return config.timezones['bspCommon'];
    }
    return 'Europe/Kaliningrad';
};

let parseError = function (xmlDoc) {
    if (xmlDoc.get('//soap-env:Body/soap-env:Fault/faultstring', nsUri)) {
        return xmlDoc.get('//soap-env:Body/soap-env:Fault/faultstring', nsUri).text();
    } else if (xmlDoc.get('//R:Error[@Type="ERR"]', nsUri)) {
        return xmlDoc.get('//R:Error[@Type="ERR"]', nsUri).text();
    }

    return '';
}
/**
 * Формирует авторизационный блок xml
 */
let getUsernameToken = function (config) {
    return xmljs.parseXml('<wsse:UsernameToken>' +
        '<wsse:Username>' + config.connection.username + '</wsse:Username>' +
        '<wsse:Password>' + config.connection.password + '</wsse:Password>' +
        '<Organization>' + config.pcc.search + '</Organization>' +
        '<Domain>DEFAULT</Domain>' +
        '</wsse:UsernameToken>').root();
};

module.exports = new SabreProvider();