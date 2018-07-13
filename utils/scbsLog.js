const fs = require('fs'),
    config = require('./../config');

var scbsLogger = function () {
};

scbsLogger.prototype.logRequest = function (providerName, requestContext, data) {
    var $message = {};
    $message.providerName = providerName;
    $message.type = 'request';
    $message.operation = requestContext.operationName;
    $message.body = data;
    $message.clientLogin = requestContext.clientLogin || 'unknown';
    $message.clientIP = requestContext.clientIP || 'unknown';
    $message.profile = requestContext.profile || 'unknown';
    $message.token = requestContext.WBtoken;

    if (config.logRemote) {
        sendMessageToControlPanels($message);
    }

    if (config.logLocal) {
        writeLog('request_' + providerName + '_' + requestContext.operationName + '_' + requestContext.WBtoken, data);
    }
};

scbsLogger.prototype.logResponse = function (provider, data) {

};

/**
 *
 * @param {String} logName
 * @param {String<xml>} logMessage
 */
let writeLog = function(logName, logMessage) {
    fs.writeFile(
        config.logDirectory + logName + '_' + Math.random().toString().substring(2, 8) + '.xml',
        logMessage,
        () => {});
};

let sendMessageToControlPanels = function ($message) {
    if (self.fs.existsSync(__dirname + '/../../controlServers.json')){
        var servers = require(__dirname + '/../../controlServers.json');
        for (var serverHost in servers){
            var url = serverHost + '/log-storage/';
            $message.login = servers[serverHost]['login'];
            $message.password = servers[serverHost]['password'];
            var req = request(
                {
                    url: url,
                    method: 'POST',
                    form: $message
                },
                function (error,response,body) {
                    if (!error && response.statusCode == 200) {
                        log.info("send log to control panel: %s", body);
                    }else{
                        log.warning('cannot send log to control panel: %s', (error ? error.toString(): response.statusCode));
                    }
                }
            );

        }
    }
}

module.exports = new scbsLogger();