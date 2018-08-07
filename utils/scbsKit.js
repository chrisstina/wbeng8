var currency = require(__dirname + '/scbsCurrency.js');

var scbsKit = (function() {
    var self;
    function scbsKit() {
        self = this;
    }

    scbsKit.prototype.searchPCC = 'searchPCC';
    scbsKit.prototype.bookPCC = 'bookPCC';
    scbsKit.prototype.ticketPCC = 'ticketPCC';
    scbsKit.prototype.validator = 'validator';

    scbsKit.prototype.getFlightGroup = function() {
        var obj = new Object();
        obj.token = '';
        obj.aggregator = '';
        obj.carrier = self.getDictionaryItem();
        obj.eticket = true;
        obj.latinRegistration = false;
        obj.timeLimit = '';
        obj.gds = '';
        obj.allowSSC = false;
        obj.itineraries = [];
        obj.fares = self.getFares();
        return obj;
    };
    scbsKit.prototype.getScheduledFlightGroup = function() {
        var obj = new Object();
        obj.token = '';
        obj.carrier = self.getDictionaryItem();
        obj.gds = '';
        obj.itineraries = [];
        return obj;
    };
    scbsKit.prototype.getAirTicket = function() {
        var obj = new Object();
        obj.carrier = self.getDictionaryItem();
        obj.eticket = 1;
        obj.issueDate = '';
        obj.recordLocator = '';
        obj.regLocator = '';
        obj.status = 'BOOKING';
        obj.number = '';
        obj.exchangeNumber = '';
        obj.passenger = self.getPassenger();
        obj.itineraries = [];
        obj.fares = self.getFares();
        return obj;
    };
    scbsKit.prototype.getReservation = function() {
        var obj = new Object();
        obj.token = '';
        obj.recordLocator = '';
        obj.regLocator = '';
        obj.date = '';
        obj.timeLimit = '';
        obj.products = new Object();
        obj.products.airTicket = new Array();
        return obj;
    };
    scbsKit.prototype.getBookingFile = function() {
        var obj = new Object();
        obj.token = '';
        obj.provider = '';
        obj.gds = '';
        obj.midoffice = '';
        obj.officeReference = [];
        obj.createDate = '';//date('c');
        obj.status = 'NEW';
        obj.paymentType = 'INVOICE';
        obj.reservations = new Array();
        obj.customer = self.getCustomer();
        obj.documents = self.getDocuments();
        return obj;
    };
    scbsKit.prototype.getOfficeReference = function(type) {
        if (type === undefined) {
            type = self.searchPCC;
        }
        var obj = new Object();
        obj.value = '';
        obj.type = type;
        return obj;
    };
    scbsKit.prototype.getPassport = function() {
        var obj = new Object();
        //$time = time() - 86400 * 365;
        obj.firstName = '';
        obj.lastName = '';
        obj.middleName = '';
        obj.citizenship = self.getDictionaryItem('RU', 'Russian Federation');
        obj.issued = '';
        //$time += 86400 * 365 * 5;
        obj.expired = '';
        obj.number = '';
        obj.type = 'INTERNAL';
        obj.birthday = '1900-01-01T12:00:00+00:00';
        obj.gender = 'MALE';
        return obj;
    };
    scbsKit.prototype.getPassenger = function() {
        var obj = new Object();
        obj.passport = self.getPassport();
        obj.type = 'ADULT';
        obj.phoneType = 'HOME_PHONE';
        obj.phoneNumber = '';
        obj.countryCode = '';
        obj.areaCode = '';
        obj.loyaltyCard = self.getLoyaltyCard();
        return obj;
    };
    scbsKit.prototype.getCustomer = function() {
        var obj = new Object();
        obj.name = '';
        obj.email = '';
        obj.countryCode = '';
        obj.areaCode = '';
        obj.phoneNumber = '';
        return obj;
    };
    scbsKit.prototype.getLoyaltyCard = function() {
        var obj = new Object();
        obj.id = '';
        obj.carrierCode = '';
        return obj;
    };
    scbsKit.prototype.getDocuments = function() {
        var obj = new Object();
        return obj;
    };
    scbsKit.prototype.getFlight = function() {
        var obj = new Object();
        obj.token = '';
        obj.segments = [];
        obj.travelDuration = 0;
        obj.seatsAvailable = 0;
        return obj;
    };
    scbsKit.prototype.getSegment = function() {
        var obj = new Object();
        obj.token = '';
        obj.serviceClass = 'ECONOMY';
        obj.bookingClass = '';
        obj.fareBasis = '';
        obj.carrier = self.getDictionaryItem();
        obj.marketingCarrier = self.getDictionaryItem();
        obj.operatingCarrier = self.getDictionaryItem();
        obj.equipment = self.getDictionaryItem();
        obj.methLocomotion = 'AVIA';
        obj.dateBegin = self.getDatetime(0, false);
        obj.dateEnd = self.getDatetime(0, false);
        obj.flightNumber = '';
        obj.terminalBegin = '';
        obj.locationBegin = self.getDictionaryItem();
        obj.cityBegin = self.getDictionaryItem();
        obj.countryBegin = self.getDictionaryItem();
        obj.terminalEnd = '';
        obj.locationEnd = self.getDictionaryItem();
        obj.cityEnd = self.getDictionaryItem();
        obj.countryEnd = self.getDictionaryItem();
        obj.starting = true;
        obj.connected = false;
        obj.travelDuration = 0;
        obj.baggage = self.getBaggage();
        obj.regLocator = '';
        obj.landings = [];
        return obj;
    };
    scbsKit.prototype.getLanding = function() {
        var obj = new Object();
        obj.locationCode = self.getDictionaryItem();
        obj.dateBegin = self.getDatetime(0, false);
        obj.dateEnd = self.getDatetime(0, false);
        return obj;
    };

    scbsKit.prototype.getScheduledSegment = function() {
        var obj = new Object();
        obj.serviceClassAvailable = [];
        obj.bookingClassAvailable = [];
        obj.operatingDays = [];
        obj.carrier = self.getDictionaryItem();
        obj.equipment = self.getDictionaryItem();
        obj.methLocomotion = 'AVIA';
        obj.dateBegin = self.getDatetime(0, false);
        obj.dateEnd = self.getDatetime(0, false);
        obj.flightNumber = '';
        obj.terminalBegin = '';
        obj.locationBegin = self.getDictionaryItem();
        obj.cityBegin = self.getDictionaryItem();
        obj.countryBegin = self.getDictionaryItem();
        obj.terminalEnd = '';
        obj.locationEnd = self.getDictionaryItem();
        obj.cityEnd = self.getDictionaryItem();
        obj.countryEnd = self.getDictionaryItem();
        obj.starting = true;
        obj.connected = false;
        obj.travelDuration = 0;
        return obj;
    };
    /**
     * Данные для маршрут-квитанций
     */
    scbsKit.prototype.getReceipt = function() {
        var obj = new Object();
        obj.barcode = '';
        obj.endorsements = []; // массив строк
        obj.fareCalculations = [];  // массив строк
        return obj;
    };
    scbsKit.prototype.getFares = function() {
        var obj = new Object();
        obj.fareDesc = self.getFareDesc();
        obj.fareSeats = [];
        obj.fareTotal = 0;
        return obj;
    };
    scbsKit.prototype.getFareSeat = function() {
        var obj = new Object();
        obj.passengerType = 'ADULT';
        obj.count = 0;
        obj.prices = [];
        obj.total = 0;
        return obj;
    };
    scbsKit.prototype.getFareDesc = function() {
        var obj = new Object();
        obj.receipt = self.getReceipt();
        return obj;
    };

    /**
     *
     * @param {String} elementType
     * @param {String} code
     * @param {Number} amount
     * @param {String} currencyIn
     * @param {String} currencyOut
     * @param {Number} fixedRate
     * @returns {Object}
     */
    scbsKit.prototype.getPrice = function(elementType, code, amount, currencyIn, currencyOut, fixedRate = null) {
        let obj = new Object();
        obj.elementType = elementType || '';
        obj.code = code || '';
        obj.amount = (amount === undefined) ? '' :
            (currencyIn !== undefined ?
                currency.convertAmount(amount, currencyIn, currencyOut, fixedRate) : amount);
        obj.currency = currencyOut;
        obj.rate = (currencyIn === undefined) ? 1 : (fixedRate ? fixedRate : currency.getRate(currencyIn, currencyOut));
        obj.amountBase = amount;
        obj.currencyBase = currencyIn;
        return obj;
    };

    /**
     * Структура для формирования данных в токене
     * @param {type} currencyIn
     * @param {type} currencyOut
     * @param {type} fixedRate
     * @param {type} date
     * @returns {nm$_scbsKit.scbsKit_L3.scbsKit.prototype.getRateDataToken.scbsKitAnonym$0}
     */
    scbsKit.prototype.getRateDataToken = function(currencyIn, currencyOut, fixedRate, date) {
        return {
            currencyIn: currencyIn,
            currencyOut: currencyOut,
            rate: fixedRate,
            conversionDate: date
        };
    };

    scbsKit.prototype.getBaggage = function() {
        var baggage = new Object();
        baggage.type = '';
        baggage.allow = '';
        baggage.value = '';
        return baggage;
    };
    scbsKit.prototype.getDatetime = function(date, zone) {
        if(date == undefined) { date = new Date(); }
        if(zone === undefined) { zone = true; }

        if(typeof(date) != 'object') {
            var date = new Date(date);
        }
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var Y = date.getFullYear();
        var H = date.getHours();
        var M = date.getMinutes();
        var s = date.getSeconds();
        var o = date.getTimezoneOffset();
        var sign = (o > 0 ? '-' : '+');
        o = Math.abs(o);
        var o1 = Math.floor( o / 60);
        var o2 = o % 60;
        Y = self.pad(Y, 4);
        m = self.pad(m, 2);
        d = self.pad(d, 2);
        H = self.pad(H, 2);
        M = self.pad(M, 2);
        s = self.pad(s, 2);
        o1 = self.pad(o1, 2);
        o2 = self.pad(o2, 2);
        var res = Y + '-' + m + '-' + d + 'T' + H + ':' + M + ':' + s;
        if(zone) { res += sign + o1 + ':' + o2; }

        return res;
    };
    scbsKit.prototype.getDictionaryItem = function(code, name) {
        var obj = new Object();
        obj.code = (code == undefined) ? '' : code;
        obj.name = (name == undefined) ? '' : name;
        return obj;
    };
    scbsKit.prototype.pad = function(val, len) {
        val = String(val);
        len = len || 2;
        while(val.length < len) { val = '0' + val; }
        return val;
    };

    /**
     * Подсчитывает общую стоимость для каждого пассажира
     *
     * @param {Array} fareSeatPrices
     * @return {number}
     */
    scbsKit.prototype.getFareSeatTotal = function (fareSeatPrices) {
        return fareSeatPrices.reduce((accumulator, current) => {
            return { amount: accumulator.amount + current.amount };
        }, {amount: 0}).amount
    };

    return new scbsKit();
})();

module.exports = scbsKit;