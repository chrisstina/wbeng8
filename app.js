const restify = require('restify')
    config = require('./config.js'),
    env = require('./utils/environment')(), // определяем окружение
    operationModule = new require('./core/operation')(),
    profileModule = new require('./core/profile')(),
    userModule = require('./core/user');

profileModule.loadProfiles(env); // загружаем все профайлы
operationModule.loadOperations();  // загружаем все модули операций

const server = restify.createServer({
    name: config.name,
    version: config.version
});

server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.jsonBodyParser({mapParams: true}));

server.use((req, res, next) => { // добавляем WBToken в context
    req.params.context.WBtoken = req.id();
    next();
});

server.use((req, res, next) => userModule.authorizeProfile(req, res, next)); // получаем профайл и авторизуем его, профайл лежит в поле userProfile

server.listen(config.port, () => {
    require('./routes.js')(server, profileModule, operationModule);
    console.log('Wbeng API server is listening on port ' + config.port + ' in ' + env + ' environment');
});

// server.on('after', restify.plugins.auditLogger({ // @todo писать куда-то в базу, например
//     log: bunyan.createLogger({
//         name: 'audit',
//         stream: process.stdout
//     }),
//     event: 'after',
//     server: server,
//     printLog : true
// }));