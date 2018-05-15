/**
 * Модуль для создания надбавки к стоимости перелета.
 * Подсчитывает размер надбавки (например, 2% надбавка "TTB" для иновалютных провайдеров)
 * и добавляет крезультатам запросов.
 */
const scbsKit = require(__dirname + '/scbsKit');

var scbsCustomTax = (function() {
    var self;

    function scbsCustomTax() {
        self = this;
    }

    /**
     * Подсчитывает размерs надбавок из настроек профайла
     * Пока не дифференцируем коды (только "TTB") и метод подсчета.
     *
     * @param config
     * @param {Number} totalFare
     * @returns {Array} массив надбавок вида [{code: '', value: 0},...]
     */
    scbsCustomTax.prototype.getCustomTaxes = function(config, totalFare) {
        var taxes = [];

        if (config.customTaxes) {
            for (var taxIdx in config.customTaxes) {
                var amount = (config.customTaxes[taxIdx].type === 'percent') ?
                    totalFare * (config.customTaxes[taxIdx].value / 100).toFixed(2) :
                    config.customTaxes[taxIdx].value;
                taxes.push({
                    elementType: 'TAXES',
                    code: config.customTaxes[taxIdx].code,
                    amount: amount,
                    amountBase: amount
                });
            }
        }
        return taxes;
    };

    /**
     * Подсчитывает общую стоимость с учетом кастомных надбавок
     * @param {Array} taxes массив надбавок вида [{code: '', value: 0},...]
     * @param {Number} totalFare
     * @returns {undefined}
     */
    scbsCustomTax.prototype.getTotalWithCustomTaxes = function(taxes, totalFare, seatCount) {
        var totalWithTax = totalFare;
        for (var taxIdx in taxes) {
            totalWithTax += parseFloat(taxes[taxIdx].amount);
        }
        if (seatCount !== undefined) {
            totalWithTax *= seatCount;
        }
        return totalWithTax;
    };

    return new scbsCustomTax();
})();

module.exports = scbsCustomTax;