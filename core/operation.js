const config = require('./../config');
const relativeDir = '../engines';

module.exports = () => {
    var operations = {};

    return {
        loadOperations: () => {
            config.providers.map((provider) => {
                operations[provider.directory] = {};
                config.operations.map((operation) => {
                    let providerOperationResourceFile = relativeDir + '/' + provider.engine + '/operations/' + operation.name;
                    try {
                        const operationModule = require(providerOperationResourceFile),
                            engine = require(relativeDir + '/' + provider.engine);
                        operations[provider.directory][operation.name] = new operationModule(engine);
                    } catch (e) {
                        console.log('Fail ' + providerOperationResourceFile + ' - ' + e.stack);
                    }
                });
            });
        },
        /**
         * @param providerName
         * @param operationName
         * @returns {*}
         */
        getProviderOperation: (providerName, operationName) => {
            return (providerName !== undefined && operations[providerName] !== undefined) ?
                operations[providerName][operationName] : null;
        }
    };
}