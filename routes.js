module.exports = function (server, profileModule, operationsModule) {

    server.get('/flights', (req, res, next) => {
        require('./operations/flights')(req, res, next, profileModule, operationsModule);
    });

    server.get('/price', (req, res, next) => {
        // определяем провайдера
        // выполняем price конкретного провайдера

        console.log('this is price');
    });

    // @todo добавить остальные
};