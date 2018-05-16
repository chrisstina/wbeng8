const restErrors = require('restify-errors'),
    requestErrors = require('request-promise-native/errors');

const config = require('./config'),
    responseFormatter = require('./utils/scbsResponse');

module.exports = function (server, profileModule, operationsModule) {

    server.get('/flights', (req, res, next) => {
        try {
            let providerName = config['providers'][req.params.context.provider];
            let operation = operationsModule.getProviderOperation(providerName, 'flights');
            let profileConfig = profileModule.getProviderProfile(req.userProfile, providerName);
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
            // пропускаем через responseFormatter чтобы привести к ожидаемому формату
            try {
                res.send(responseFormatter.response(result));
                next();
            } catch (e) {
                console.error(e);
                next(new restErrors.InternalServerError());
            }
        })
        .catch((err) => {
            try {
                res.send(responseFormatter.errorResponse(err));
            } catch (e) {
                console.error(e);
            } finally {
                next(new restErrors.InternalServerError());
            }
        });
    });

    server.get('/price', (req, res, next) => {
        // определяем провайдера
        // выполняем price конкретного провайдера

        console.log('this is price');
    });

    // @todo добавить остальные
};