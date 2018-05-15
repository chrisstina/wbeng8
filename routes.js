const errors = require('restify-errors');
const config = require('./config');

module.exports = function (server, profileModule, operationsModule) {

    server.get('/flights', (req, res, next) => {
        try {
            var providerName = config['providers'][req.params.context.provider];
            var operation = operationsModule.getProviderOperation(providerName, 'flights');
            var profileConfig = profileModule.getProviderProfile(req.userProfile, providerName);
        } catch (e) {
            next(e);
        }

        // выполняем flights конкретного провайдера
        operation.execute(
            req.params.context,
            req.params.parameters,
            profileConfig
        )
        .then((result) => {
            res.send(result);
            next();
        })
        .catch((err) => {
            next(new errors.InternalServerError('Внутренняя ошибка сервера')); // @todo стандартизировать ошибки
        });
    });

    server.get('/price', (req, res, next) => {
        // определяем провайдера
        // выполняем price конкретного провайдера

        console.log('this is price');
    });

    // @todo добавить остальные
};

var getProviderOperation = (providerName, operationName) => {

}