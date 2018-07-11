module.exports = function (server) {
    // @todo брать из конфига и по списку генерить
    server.get('/flights', (req, res, next) => {
        require('./operations/flights')(req, res, next);
    });

    server.get('/price', (req, res, next) => {
        // определяем провайдера
        // выполняем price конкретного провайдера

        console.log('this is price');
    });

    // @todo добавить остальные
};