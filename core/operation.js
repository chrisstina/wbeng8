const fs = require('fs');
const providersDir = __dirname + '/../providers';
const relativeDir = '../providers';

module.exports = () => {
    var operations = {};

    return {
        loadOperations: () => {
            var providersList = fs.readdirSync(providersDir);

            providersList.map(function(providerDir) {
                var providerOperationDir = providersDir + '/' + providerDir + '/operations';
                var operationsList = fs.readdirSync(providerOperationDir);

                operations[providerDir] = {};

                operationsList.map(function(operationFile) {
                    var matches = /^(.*)\.js$/.exec(operationFile);
                    if (matches !== null && fs.statSync(providerOperationDir + '/' + operationFile).isFile()) {
                        try {
                            var operation = require(relativeDir + '/' + providerDir + '/operations/' + operationFile);
                        } catch (e) {
                            console.log('Fail ' + relativeDir + '/' + providerDir + '/operations/' + operationFile + ' - ' + e.stack);
                        }

                        if (typeof operation !== 'undefined'&& matches[1] !== undefined) {
                            operations[providerDir][matches[1]] = operation;
                        }
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
            return operations[providerName][operationName];
        }
    };
}