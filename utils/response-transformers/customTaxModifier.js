var customTax = require('../scbsCustomTax');

/**
 * Добавляет customTax Из настроек провайдера к финальной стоимости
 *
 * @param {Array} input - массив уже отсортированных элементов
 * @param {Array} requestParams
 * @param {Array} profileConfig
 * @return {Array} input с customTax, структура input сохранена
 */
module.exports = function (input, requestParams, profileConfig) {
    input.map(function (variant) {
        for (let fareIdx in variant.fares.fareSeats) {
            let zzTaxes = customTax.getCustomTaxes(profileConfig, variant.fares.fareSeats[fareIdx].total);
            if (zzTaxes) {
                let zzTaxesTotal = zzTaxes.reduce((accumulator, current) => {
                    return {amount: accumulator.amount + current.amount};
                }, {amount: 0});
                variant.fares.fareSeats[fareIdx].prices = variant.fares.fareSeats[fareIdx].prices.concat(zzTaxes);
                variant.fares.fareSeats[fareIdx].total += zzTaxesTotal.amount;
                variant.fares.fareTotal += zzTaxesTotal.amount;
            }
        }
    });
    return input;
};