var basicProvider = require("../../core/basic-provider").BasicProvider,
    WbengError = require("../../errors/wbeng-error"),
    request = require("request-promise-native"),
    xmljs = require('libxmljs');

var SabreProvider = function () {};


var parseError = function(xmlDoc) {
  if (xmlDoc.get('//soap-env:Body/soap-env:Fault/faultstring', nsUri)) {
    return xmlDoc.get('//soap-env:Body/soap-env:Fault/faultstring', nsUri).text();
  }
  return '';
}
/**
 * Формирует авторизационный блок xml
 */
var getUsernameToken = function(config) {
  return xmljs.parseXml('<wsse:UsernameToken>' +
      '<wsse:Username>' + config.connection.username + '</wsse:Username>' +
      '<wsse:Password>' + config.connection.password + '</wsse:Password>' +
      '<Organization>' + config.pcc.search + '</Organization>' +
      '<Domain>DEFAULT</Domain>' +
    '</wsse:UsernameToken>').root();
};

/** @todo можно запихнуть в модуль config (экспортить настройки) */

var requestTimeout = 100000;

var nsUri = {
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
  'eab': 'http://services.sabre.com/sp/eab/v3_7',
  'pd': 'http://services.sabre.com/sp/pd/v3_3',
  'tir': 'http://services.sabre.com/res/tir/v3_6',
  'tir39': 'http://services.sabre.com/res/tir/v3_9',
  'c': 'http://webservices.sabre.com/sabreXML/2011/10',
  'stl': 'http://services.sabre.com/STL/v01',
  'nopnr':'http://webservices.sabre.com/sabreXML/2003/07'
};

var XMLTemplate = 
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

/**
 * 
 * @param {type} requestBody
 * @param {type} profile
 * @param {type} parameters
 * @param {type} requestHeaders
 * @returns Promise
 */
SabreProvider.prototype.runRequest = function(requestBody, profile, parameters, parseCallback, requestHeaders = {}) {
  var profileConfig = basicProvider.getProfileConfig(profile, 'sabre'),
      headers = {
        'Content-Type': 'text/xml',
        'Domain': profileConfig.connection.domain
      };
  
  var requestOptions = {
      method: "POST",
      uri: profileConfig.connection.url,
      headers: Object.assign(requestHeaders, headers),
      body: requestBody,
      timeout: requestTimeout
  };
  
  return request.post(requestOptions)
    .then(parseCallback)
    .catch(function(error) {
      var errorText = "";
      if (error.error) {
        errorText = parseError(xmljs.parseXml(error.error));
      } else {
        errorText = "Внутренняя ошибка сервера";
      }
      console.error(error.stack);
      throw new WbengError(errorText, parameters);
    });
};

/**
 * @param {type} xmlBody
 * @param {type} profile
 * @param {type} serviceName
 * @param {type} actionName
 * @param {type} sessionToken
 * @returns Promise
 */
SabreProvider.prototype.buildRequest = function(xmlBody, profile, serviceName, actionName, sessionToken = null) {
  var xmlDoc = xmljs.parseXml(XMLTemplate);
  var profileConfig = basicProvider.getProfileConfig(profile, 'sabre');
  
  if (sessionToken === null) { // открываем сессию
     xmlDoc.get('//wsse:Security', nsUri).addChild(getUsernameToken(profileConfig));
  } else { // передаем токен
    xmlDoc.get('//wsse:Security', nsUri).addChild('wsse:BinarySecurityToken').text(sessionToken);
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

module.exports = new SabreProvider();