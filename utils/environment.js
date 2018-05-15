module.exports = () => {
    var globalEnvironment = 'production'; // ставим значение по-умолчанию, если нет возможности указать через APP_ENVIRONMENT
    var argv = require('minimist')(process.argv.slice(2)); // смотрим параметры командной строки

    if (argv.env !== undefined) {
        if (argv.env === 'production' || argv.env === 'test') {
            globalEnvironment = argv.env;
        }
    } else if (process.env.APP_ENVIRONMENT !== undefined &&
        process.env.APP_ENVIRONMENT !== 'undefined') { // смотрим переменную окружения
        globalEnvironment = process.env.APP_ENVIRONMENT;
    }
    return globalEnvironment;
};