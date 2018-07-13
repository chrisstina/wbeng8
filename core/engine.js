const scbsLog = require('./../utils/scbsLog'),
    rp = require('request-promise-native'),
    xmljs = require('libxmljs');

/**
 * Распарсивает XML ответ в нужную структуру.
 * Дополнительно проверяем на наличие ошибок.
 * Логируем. @todo логирование нормальное
 *
 * @param parseCallback :: [xmlDoc, profileConfig, parameters] → Array
 * @param body raw response text
 * @param profileConfig
 * @param parameters
 * @param parseErrorCallback - опциональный парсер для ошибок
 * @returns {{}}
 */
const parse = function (parseCallback, body, profileConfig, parameters, parseErrorCallback = null) {
    let xmlDoc = xmljs.parseXml(body);
    let errorText = parseErrorCallback !== null ? parseErrorCallback(xmlDoc) : '';

    // console.log('response' + xmlDoc);

    if (errorText !== '') {  // @todo тут могут быть не только ошибки, оборачивать в messages
        throw new Error('Ошибка от GDS: "' + errorText + '"');
    }

    return (parseCallback !== null && parseCallback !== undefined) ?
        parseCallback(xmlDoc, profileConfig, parameters) : {};
};

module.exports = (() => {
    return {
        /**
         * Отправляет POST запрос
         *
         * @param uri
         * @param headers
         * @param requestBody
         * @param {function (xmlDoc, profileConfig, parameters) : Array}  parseCallback
         * @param profileConfig
         * @param parameters
         * @param {function (xmlDoc, profileConfig, parameters) : Array}  parseErrorCallback - опциональный парсер для ошибок, сначала запускается он
         * @return Request
         */
        request: function(uri, headers, requestBody, parseCallback, profileConfig, parameters, parseErrorCallback) {
            const requestOptions = {
                rejectUnauthorized: false, // иначе ошибка self signed certificate
                uri: uri,
                headers: headers,
                body: requestBody,
                timeout: 100000,
                transform: (body, response, resolveWithFullResponse) => { // оборачиваем метод трансформации, чтобы были видны parameters и profileConfig
                    return parse(parseCallback, body, profileConfig, parameters, parseErrorCallback);
                }
            };

            scbsLog.logRequest(profileConfig.desc, parameters.context, requestBody);
            return rp.post(requestOptions);
        },
        getNodeAttr: (node, attr, def) => {
            if (typeof def === 'undefined') {
                def = false;
            }
            return (node && node.attr(attr) ? node.attr(attr).value() : def);
        },
        getNodeText: (node, text) => {
            return (node && node.get(text) ? node.get(text).text() : '');
        }
    };
})();