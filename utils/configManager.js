const config = require('./../config');

module.exports = (() => {
    return {
        /**
         * Берет из общего конфига данные операции (название, responseFormatter и т.п.)
         * @param operationName
         * @return {Object|null}
         */
        getOperationSettings: operationName => {
            return config.operations.find((element) => {
                return element.name === operationName;
            });
            return null;
        },
        /**
         * Берет из общего конфига данные провайдера (код, движок, папка настроек и т.п.)
         * @param code
         * @return {Object|null}
         */
        getProviderSettingsByCode: (code) => {
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
    };
})();
