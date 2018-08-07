/**
 *
 * @param gds
 * @param carrier
 * @return {boolean}
 */
let isAlternativeFareAllowed = function(gds, carrier) {
    const config = require('./../../config');
    for (var i in config.alternativeFaresAllowed) {
        if (config.alternativeFaresAllowed[i].gds === gds) {
            return config.alternativeFaresAllowed[i].carriers.indexOf('*') !== -1 ||
                config.alternativeFaresAllowed[i].carriers.indexOf(carrier) !== -1
        }
    }
    return false;
};

/**
 * Проставляет флаг - возможен ли запрос alt fares для перелета
 * @param {Array} input - массив перелетов
 * @return {Array} массив перелетов с проставленным allowSSC
 */
module.exports = function (input) {
    input.map(function (item, itemIdx) {
        input[itemIdx].allowSSC = isAlternativeFareAllowed(item.gds, item.carrier.code);
    });

    return input;
};