const DECIMAL_POINTS = 8;// количество знаков после запятой для курса валюты

const logModule = require('log'),
    fs = require('fs'),
    stream = fs.createWriteStream('log/currency.log', { flags: 'a' }),
    moment = require('moment'),
    log = new logModule(),
    currencyLog = new logModule('debug', stream);

var scbsCurrency = (function() {

    function scbsCurrency() {
    }

    /**
     * Конвертирует сумму в указанную валюту
     * @param amount
     * @param currencyIn
     * @param currencyOut
     * @param fixedRate
     * @param provider
     * @param operation
     * @param pnr
     * @param priceType
     * @returns {number | *}
     */
    scbsCurrency.prototype.convertAmount = function(amount, currencyIn, currencyOut, fixedRate) {
        let rate, finalAmount, isHistorical = (fixedRate !== undefined && fixedRate !== null);
        if ( ! isHistorical || fixedRate === null) {
            rate = this.getRate(currencyIn, currencyOut);
        } else {
            rate = fixedRate;
            log.info('Converted from %s to RUB with historical rate %s', currencyIn, fixedRate);
        }

        finalAmount = parseFloat((amount * rate).toFixed(DECIMAL_POINTS));
        return finalAmount;
    };

    /**
     * @param currencyIn
     * @param currencyOut
     */
    scbsCurrency.prototype.getRate = function(currencyIn, currencyOut) {
        return 1;

        if (currencyOut === undefined) {
            currencyOut = 'RUB';
        }

        if (currencyIn === currencyOut) {
            return 1;
        }

        var allRates = cache.get('all-rates');
        if (allRates === undefined) {
            throw Error('Failed to retrieve rate data from CBR service.');
        }

        var rate = calculateRawRate(allRates, currencyIn, currencyOut);
        if (rate !== undefined) {
            return parseFloat(rate.toFixed(DECIMAL_POINTS));
        } else {
            log.debug('Could not retrieve rate for currency %s, %s', currencyIn, currencyOut);
            throw Error('Could not retrieve rate for ' + currencyIn + ' / ' + currencyOut);
        }
    };

    /**
     * @param allRates
     * @param currencyIn
     * @param currencyOut
     * @returns {*}
     */
    let calculateRawRate = function(allRates, currencyIn, currencyOut) {
        if (currencyIn === 'RUB' || currencyOut === 'RUB') {
            var altCurrency = (currencyIn === 'RUB') ? currencyOut : currencyIn,  // к какой валюте ищем курс
                rateToRUB = getRateRUB(altCurrency, allRates);// курс XXX|RUB

            if (currencyOut === 'RUB') {
                return rateToRUB;  // XXX|RUB - сколько будет в рублях рублей сумма в XXX?
            } else {
                return 1 / rateToRUB; // RUB|XXX - сколько будет в ХХХ сумма в рублях?
            }
        } else { // кросс-курсы
            let inToRUB = getRateRUB(currencyIn, allRates),
                outToRUB = getRateRUB(currencyOut, allRates);
            return (1 / outToRUB) / (1 / inToRUB);
        }
    };

    /**
     * Возвращает курс к рублю
     * @param {type} currencyIn
     * @param {type} allRates
     * @returns {unresolved}
     */
    let getRateRUB = function(currencyIn, allRates) {
        if (currencyIn === undefined) {
            log.debug('Undefined currency');
            return 1; // если что-то пошло не так, возвращаем  курс RUB|RUB
        }

        let rate = allRates[currencyIn.toLowerCase()];
        if ( rate !== undefined ) {
            return parseFloat((rate.value / rate.par).toFixed(DECIMAL_POINTS)); // курс XXX|RUB
        } else {
            log.debug('Could not retrieve rate for currency %s', currencyIn);
            throw Error('Could not retrieve rate for ' + currencyIn);
        }
    };

    return new scbsCurrency();
})();

module.exports = scbsCurrency;

