const configManager = require('./../utils/configManager'),
    operationModule = require('./../core/operation'),
    profileModule = require('./../core/profile'),
    scbsMessenger = require('./../utils/scbsMessenger'),
    ScbsResponse = require('./../utils/scbsResponse'),
    restErrors = require('restify-errors');

const operationConfig = configManager.getOperationSettings('flights');
const transformCallbacks = configManager.getOperationTransformCallbacks(operationConfig);

module.exports = function (req, res, next) {
    // @todo если понадобится другой форматтер, можно вынести в настройки
    let scbsResponse = new ScbsResponse(operationConfig.exit, req.params.context.WBtoken, req.userProfile); // подготавливаем преобразователь ответа

    console.time('[' + req.params.context.WBtoken + '] Flights total execution time');

    Promise.all(getSearchRequests(req)) // разом запускаем все запросы поиска
    .then((results) => {
        try {
            res.send(
                scbsResponse
                    .setRawResponse(results)
                    .setProfileData()
                    .sort()
                    .getFormattedResponse());
            console.timeEnd('[' + req.params.context.WBtoken + '] Flights total execution time');
            next();
        } catch (e) {
            console.error(req.params.context.WBtoken, e);
            next(new restErrors.InternalServerError());
        }
    })
    .catch((err) => {
        try {
            res.send(
                scbsResponse
                    .formatErrorResponse(err)
                    .getFormattedResponse());
        } catch (e) {
            console.error(e);
        } finally {
            next(new restErrors.InternalServerError());
        }
    });
};

/**
 * @param req
 * @return {Array<Promise>}
 */
let getSearchRequests = function (req) {
    let providerCodes = req.params.context.provider.split(',');
    var searchRequests = [], profileStartTime = {};

    providerCodes.map((code) => {
        let providerSettings = configManager.getProviderSettingsByCode(code);
        var providerName = (providerSettings !== null) ? providerSettings.directory : null;
        var providerOperation = operationModule.getProviderOperation(providerName, 'flights');
        if (providerOperation !== null && 'execute' in providerOperation) {
            let profileConfig = profileModule.getProviderProfile(req.userProfile, providerName);
            searchRequests.push( // набираем запросы конкретных провайдеров на параллельное исполнение
                Promise.resolve()
                .then(() => beforeEachExecute(req, code))
                .then(startTime => { // запрос провайдеру выполняется здесь
                    profileStartTime[code] = startTime;
                    req.params.context.operationName = 'flights';
                    req.params.parameters.context = req.params.context; // дальше в execute передаются только parameters
                    return providerOperation.execute(req.params.context, req.params.parameters, profileConfig);
                })
                .then(providerOperationResults => {
                    return afterEachExecute(req, code, profileConfig, providerOperationResults, profileStartTime[code])
                })
                // отлов ошибок каждого запроса. засчет этого, если один из запросов фэйлится, остальные продолжат выполняться
                .catch(error => afterEachExecute(req, code, profileConfig, [], profileStartTime[code], error))
            );
        } else {
            console.log('Не найдена операция или не найден метод execute для операции ' + providerName + '.flights');
        }
    });

    return searchRequests;
};

/**
 * То что будет выполнено перед вызовом операции каждого провайдера
 * @param req
 */
let beforeEachExecute = function (req, providerCode) {
    console.info('Токен запроса %s flights %s', providerCode, req.params.context.WBtoken);
    console.time('[' + req.params.context.WBtoken + '] ' + providerCode + " flights execution time");
    return new Date();
};

/**
 * Подготавливаем каждый ответ в нужном для разбора формате.
 * Прогоняем через трансформеры, настроенные в конфиге
 * @param req
 * @param {Array} providerOperationResult - результат parse провайдера
 * @param {Date} profileStartTime
 * @param {Error|null} error
 * @return {{data: *, messages: Array, provider: String}}
 */
let afterEachExecute = function (req, providerCode, profileConfig, providerOperationResult, profileStartTime, error = null) {
    console.timeEnd('[' + req.params.context.WBtoken + '] ' + providerCode + " flights execution time");

    let transformedResult = transform(providerOperationResult, req.params, profileConfig);

    let response = {
        data: transformedResult,
        messages: [], // @todo messages
        provider: providerCode,
        execTime: new Date() - profileStartTime
    };

    if (error !== null) {
        response.messages = [scbsMessenger.getMessage(error.stack.split("\n")[0].trim() + ' ' + error.stack.split("\n")[1].trim(), 'REQUEST')]
    }

    return response;
};

/**
 * Прогоняет по всем трансформерам ответа, настроенным в конфиге
 * @param {Array} providerOperationResult
 * @param {Array} requestParams
 * @param {Array} profileConfig
 * @return {Array}
 */
let transform = function (providerOperationResult, requestParams, profileConfig) {

    console.log('TRANSFORM');

    var transformedResult = providerOperationResult;
    transformCallbacks.map(function (transformCallback) {
        transformedResult = transformCallback(transformedResult || providerOperationResult, requestParams, profileConfig);
    });
    return transformedResult;
};