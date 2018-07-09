const config = require('./../config');

const rp = require('request-promise-native'),
    xmljs = require('libxmljs');

/**
 * Распарсивает XML ответ в нужную структуру.
 * Дополнительно проверяем на наличие ошибок.
 * Логируем. @todo логирование нормальное
 *
 * @param parseCallback
 * @param body
 * @param profileConfig
 * @param parameters
 * @param parseErrorCallback - опциональный парсер для ошибок
 * @returns {{}}
 */
const parse = function (parseCallback, body, profileConfig, parameters, parseErrorCallback = null) {
    let xmlDoc = xmljs.parseXml(body);
    let errorText = parseErrorCallback !== null ? parseErrorCallback(xmlDoc) : '';

    /*console.log('response' + xmlDoc);

    if (errorText !== '') {  // @todo тут могут быть не только ошибки, оборачивать в messages
        throw new Error('GDS вернула ошибку ' + errorText);
    }*/

    return (parseCallback !== null && parseCallback !== undefined) ?
        parseCallback(xmlDoc, profileConfig, parameters) : {};
};

module.exports = (() => {
    return {
        getByCode: (code) => {
            let p = config.providers.find((element) => {
                return element.code === code;
            });

            return (p !== undefined) ? p : null;
        },
        getByDirectory: (code) => {
            let p = config.providers.find((element) => {
                return element.directory === code;
            });

            return (p !== undefined) ? p : null;
        },
        /**
         * Отправляет POST запрос
         *
         * @param uri
         * @param headers
         * @param requestBody
         * @param parseCallback
         * @param profileConfig
         * @param parameters
         * @return Request
         */
        request: function(uri, headers, requestBody, parseCallback, profileConfig, parameters) {
            const requestOptions = {
                rejectUnauthorized: false, // иначе ошибка self signed certificate
                uri: uri,
                headers: headers,
                body: requestBody,
                timeout: 100000,
                transform: (body, response, resolveWithFullResponse) => { // оборачиваем метод трансформации, чтобы были видны parameters и profileConfig
                    return parse(parseCallback, body, profileConfig, parameters);
                }
            };

            console.log(requestBody); // @todo вывод в файл
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