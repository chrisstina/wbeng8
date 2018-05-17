const xmljs = require('libxmljs');

module.exports = () => {
    return {
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
        parse: (parseCallback, body, profileConfig, parameters, parseErrorCallback = null) => {
            let xmlDoc = xmljs.parseXml(body);
            let errorText = parseErrorCallback !== null ? parseErrorCallback(xmlDoc) : '';

            console.log('response' + xmlDoc);

            if (errorText !== '') {
                throw new Error('GDS вернула ошибку ' + errorText);
            }

            return (parseCallback !== null && parseCallback !== undefined) ?
                parseCallback(xmlDoc, profileConfig, parameters) : {};
        },
        getNodeAttr: (node, attr, def) => {
            if (typeof def === 'undefined') {
                def = false;
            }
            return (node && node.attr(attr) ? node.attr(attr).value() : def);
        }
    };
}