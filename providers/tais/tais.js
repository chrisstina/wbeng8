const rp = require('request-promise-native'),
    xmljs = require('libxmljs');

const basicProvider = new require('./../../core/provider')(),
    env = require('./../../utils/environment')(),
    scbsKit = require('../../utils/scbsKit'),
    tokenCrypt = require('./../../core/tokenCrypt');

const nsUri = {
    'SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
    'SIG': env === 'test' ? "https://sigtest.tais.ru/SIG/" : "https://sigag.tais.ru/SIG/"
};

const nsUriRequest = {
    'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
    'xmlns:sig': "https://sigag.tais.ru/SIG/"
};

const gds = {
    '1G': 'GALILEO',
    '1H': 'SIRENA',
    'S7': 'SITA',
    '1A': 'AMADEUS',
    '1M': 'SIAM'
}

var TaisProvider = function () {
};

var self = this;

TaisProvider.prototype.code = 'TA';
TaisProvider.prototype.name = 'Tais';
TaisProvider.prototype.nsUri = nsUri;
TaisProvider.prototype.ignoredLocations = ["SIP"];

TaisProvider.prototype.getGDS = (code) => {
    return (gds[code] !== undefined) ? gds[code] : '';
};

TaisProvider.prototype.getPaxType = function (code) {
    switch (code) {
        case 'ADULT':
            return 'ADT';
            break;
        case 'YOUTH':
            return 'YTH';
            break;
        case 'SENIOR':
            return 'SRC';
            break;
        case 'CHILD':
            return 'CHD';
            break;
        case 'INFANT':
            return 'INF';
            break;
        case 'WSEATINFANT':
            return 'CHD';
            break;
    }
};

TaisProvider.prototype.getPaxPair = function (code) {
    switch (code) {
        case 'ADULT':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: 'adt0'
            };
            break;
        case 'CHILD':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: 'child'
            };
            break;
        case 'YOUTH':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: 'youth'
            };
            break;
        case 'SENIOR':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: ''
            };
            break;
        case 'INFANT':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: 'infant'
            };
            break;
        case 'WSEATINFANT':
            return {
                AgeCat: this.getPaxType(code),
                PTRef: 'child'
            };
            break;
    }
};

TaisProvider.prototype.getSystemPax = function (code) {
    switch (code) {
        case 'ADT':
            return 'ADULT';
            break;
        case 'YTH':
            return 'YOUTH';
            break;
        case 'SRC':
            return 'SENIOR';
            break;
        case 'CHD':
            return 'CHILD';
            break;
        case 'INF':
            return 'INFANT';
            break;
        case 'INS':
            return 'WSEATINFANT';
            break;
    }
};

TaisProvider.prototype.getSystemDoc = function (code) {
    switch (code) {
        case 'PS':
            return 'INTERNAL';
            break;
        case 'INTERNAL':
            return 'PS';
            break;
        case 'PSP':
            return 'FOREIGN';
            break;
        case 'FOREIGN':
            return 'PSP';
            break;
        case 'SR':
            return 'BIRTHDAY_NOTIFICATION';
            break;
        case 'BIRTHDAY_NOTIFICATION':
            return 'SR';
            break;
        case 'NP':
            return 'PASSPORT';
            break;
        case 'PASSPORT':
            return 'NP';
            break;
    }
};

/**
 *
 * @param requestBody
 * @param transformCallback  метод для парсинга ответа
 * @param profileConfig
 * @param parameters
 * @param requestHeaders
 * @returns Request
 */
TaisProvider.prototype.request = function (requestBody, parseCallback, profileConfig, parameters) {
    const requestOptions = {
        method: "POST",
        rejectUnauthorized: false, // иначе ошибка self signed certificate
        uri: profileConfig.connection.url,
        headers: {
            'Content-Type': 'text/xml',
            'Domain': profileConfig.connection.domain,
            'Authorization': 'Basic ' + new Buffer(profileConfig.connection.username + ':' + profileConfig.connection.password).toString('base64')
        },
        body: requestBody,
        timeout: 100000,
        transform: (body, response, resolveWithFullResponse) => { // оборачиваем метод трансформации, чтобы были видны parameters и profileConfig
            return parse(parseCallback, body, profileConfig, parameters);
        }
    };

    console.log(requestBody); // @todo вывод в файл

    return rp.post(requestOptions);
};

/**
 *
 * @param xmlBody
 * @param profileConfig
 * @returns {*}
 */
TaisProvider.prototype.wrapRequest = (xmlBody, profileConfig) => {
    let xmlRequestWrapDocument = new xmljs.Document();

    xmlBody.root().attr({CustomerID: profileConfig.customerID});

    xmlRequestWrapDocument.node('soapenv:Envelope').attr(nsUriRequest)
        .node('soapenv:Header').parent()
        .node('soapenv:Body')
            .node('sig:SIG_Request').addChild(xmlBody.root());

    return xmlRequestWrapDocument.toString();
};

TaisProvider.prototype.parseItineraries = (itineraryOptions, sessionID, shopOptionID, shopOption) => {
    let itineraries = [],
        itineraryID,
        order, i;

    for (i = 0; i < itineraryOptions.length; i++) {
        itineraryID = basicProvider.getNodeAttr(itineraryOptions[i], 'ItineraryRef');
        order = parseInt(itineraryOptions[i].attr('ODRef').value());
        if (!itineraries[order]) {
            itineraries[order] = {
                token: '',
                flights: []
            };
        }
        itineraries[order].flights.push({
            token: tokenCrypt.encode({
                code: sessionID + '|' + shopOptionID + '|' + itineraryID,
                carriers: parseFareCarriers(itineraryOptions[i].find('SIG:FlightSegment', nsUri))
            }),
            seatsAvailable: parseInt(basicProvider.getNodeAttr(itineraryOptions[i], 'SeatsAvailable')),
            segments: parseSegments(itineraryOptions[i].find('SIG:FlightSegment', nsUri), shopOption)
        });
    }
    return itineraries;
};

let parseFares = function (Fares, zzTaxes, parameters) {
    var Taxes, i, j, amount, code, price, Fare, responseCurrency;
    var len = Fares.length;
    for(i = 0; i < len; i++) {
        Fare = scbsKit.getFareSeat();
        Fare.passengerType = this.getSystemPax(basicProvider.getNodeAttr(Fares[i].get('SIG:PaxType', nsUri), 'AgeCat'));
        Fare.count = parseInt(basicProvider.getNodeAttr(Fares[i].get('SIG:PaxType', nsUri), 'Count'));
        amount = (parseFloat(basicProvider.getNodeAttr(Fares[i].get('SIG:Price', nsUri), 'EquivFare'))
            || parseFloat(basicProvider.getNodeAttr(Fares[i].get('SIG:Price', nsUri), 'BaseFare')));
        responseCurrency = basicProvider.getNodeAttr(Fares[i].get('SIG:Price', nsUri), 'Currency')
            || basicProvider.getNodeAttr(Fares[i].get('SIG:Price', nsUri), 'BaseCurrency');

        Fare.prices[0] = scbsKit.getPrice(
            'TARIFF',
            '',
            amount,
            responseCurrency,
            parameters.currency,
            null, // fixedRate не учитываем, т.к. здесь будут парситься только не выписанные заказы
            this);

        Taxes = Fares[i].find('SIG:Taxes/SIG:Tax', nsUri);
        for (j = 0; j < Taxes.length; j++) {
            amount = parseFloat(basicProvider.getNodeAttr(Taxes[j], 'Amount'));
            code = basicProvider.getNodeAttr(Taxes[j], 'TicketCode');
            price = scbsKit.getPrice(
                'TAXES',
                code,
                amount,
                responseCurrency,
                parameters.currency,
                null, // fixedRate не учитываем, т.к. здесь будут парситься только не выписанные заказы
                this);
            Fare.prices.push(price);
        }
        for (var z in zzTaxes) {
            Fare.prices.push(zzTaxes[z]);
        }
        Fares[i] = Fare;
    }
    return Fares;
};

let parseTicketFares = function (Ticket) {
    var Taxes, i, j, amount, code, price;

    var Fare = scbsKit.getFareSeat();
    Fare.passengerType = this.getSystemPax(basicProvider.getNodeAttr(Ticket.get('SIG:TicketData/SIG:Passenger', nsUri), 'AgeCat'));
    Fare.count = 1;
    amount = (parseFloat(basicProvider.getNodeAttr(Ticket.get('SIG:TicketData/SIG:Price', nsUri), 'EquivFare'))
        || parseFloat(basicProvider.getNodeAttr(Ticket.get('SIG:TicketData/SIG:Price', nsUri), 'BaseFare')));
    Fare.prices[0] = scbsKit.getPrice('TARIFF', '', amount);

    Taxes = Ticket.find('SIG:TicketData/SIG:Taxes/SIG:Tax', nsUri);
    for(j = 0; j < Taxes.length; j++) {
        amount = parseFloat(basicProvider.getNodeAttr(Taxes[j], 'Amount'));
        code = basicProvider.getNodeAttr(Taxes[j], 'TicketCode');
        price = scbsKit.getPrice('TAXES', code, amount);
        Fare.prices.push(price);
    }

    return [Fare];
};

let parsePassenger = function (passengerNode) {
    var passenger = scbsKit.getPassenger();

    passenger.passport.firstName = basicProvider.getNodeAttr(passengerNode, 'FirstName');
    passenger.passport.lastName = basicProvider.getNodeAttr(passengerNode, 'LastName');
    passenger.passport.citizenship.code = basicProvider.getNodeAttr(passengerNode, 'DocCountry');
    passenger.passport.expired = basicProvider.getNodeAttr(passengerNode, 'DocExpiration');
    passenger.passport.number = basicProvider.getNodeAttr(passengerNode, 'DocNumber');
    passenger.passport.type = this.getSystemDoc(basicProvider.getNodeAttr(passengerNode, 'DocType'));
    passenger.passport.birthday = basicProvider.getNodeAttr(passengerNode, 'DOB');
    passenger.passport.gender = (basicProvider.getNodeAttr(passengerNode, 'Title') === 'MR' ? 'MALE' : 'FEMALE');
    passenger.type = this.getSystemPax(basicProvider.getNodeAttr(passengerNode, 'AgeType'));
    //passenger.countryCode = basicProvider.getNodeAttr(passengerNode, 'countryCode');
    //passenger.areaCode = basicProvider.getNodeAttr(passengerNode, 'areaCode');
    return passenger;
};

let parseSegments = function (FlightSegments, ShopOption){
    var segment;
    var len = FlightSegments.length;

    var trainMark = new Array('TRN', 'ICE', 'TRAIN', 'TRS');
    var busMark = new Array('BUS');

    for(var i = 0; i < len; i++) {

        var reservationRef = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:ReservationDetails/SIG:Reservation', nsUri), 'ReservationRef');
        var segmentID = basicProvider.getNodeAttr(FlightSegments[i], 'FlightRef');

        segment = scbsKit.getSegment();

        segment.serviceClass = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:ReservationDetails/SIG:Reservation', nsUri), 'Cabin');
        segment.bookingClass = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:ReservationDetails/SIG:Reservation', nsUri), 'RBD');
        segment.flightNumber = basicProvider.getNodeAttr(FlightSegments[i], 'Flight');
        segment.travelDuration = (Date.parse(basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Arrival', nsUri), 'Time'))
            - Date.parse(basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Departure', nsUri), 'Time'))) / 60000;
        segment.regLocator = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:ReservationDetails/SIG:Reservation', nsUri), 'AirlineRecordLocator');
        segment.operatingCarrier.code = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:OperatingAirline', nsUri), 'Airline', '');
        segment.carrier.code = segment.operatingCarrier.code !== '' ? segment.operatingCarrier.code : basicProvider.getNodeAttr(FlightSegments[i], 'Airline');
        segment.equipment.code = basicProvider.getNodeAttr(FlightSegments[i], 'Equipment');
        segment.locationBegin.code = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Departure', nsUri), 'Airport');
        segment.cityBegin.code = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Departure', nsUri), 'City');
        segment.locationEnd.code = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Arrival', nsUri), 'Airport');
        segment.cityEnd.code = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Arrival', nsUri), 'City');
        segment.dateBegin = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Departure', nsUri), 'Time');
        segment.dateEnd = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Arrival', nsUri), 'Time');
        segment.terminalBegin = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Departure', nsUri), 'Terminal');
        segment.terminalEnd = basicProvider.getNodeAttr(FlightSegments[i].get('SIG:Arrival', nsUri), 'Terminal');
        if (ShopOption !== undefined) {
            segment.fareBasis = basicProvider.getNodeAttr(ShopOption.get('SIG:FareInfo/SIG:Fares/SIG:Fare/SIG:Itinerary/SIG:FlightSegmentDetails[contains(@ReservationRefs, "' + reservationRef + '")]', nsUri), 'FareBasis');
        }

        if(trainMark.indexOf(segment.equipment.code) != -1) {
            segment.methLocomotion = 'TRAIN';
        } else if(busMark.indexOf(segment.equipment.code) != -1) {
            segment.methLocomotion = 'BUS';
        }

        FlightSegments[i] = segment;
    }
    return FlightSegments;
};

/**
 * Возвращает массив вида [<а\к><рейс>] для запроса брендов
 */
let parseFareCarriers = function (FlightSegments) {
    var fareCarriers = [];
    for (var i in FlightSegments) {
        fareCarriers.push(basicProvider.getNodeAttr(FlightSegments[i], 'Airline') + basicProvider.getNodeAttr(FlightSegments[i], 'Flight'));
    }
    return fareCarriers;
};

let parse = (parseCallback, body, profileConfig, parameters) => {
    return basicProvider.parse(parseCallback, body, profileConfig, parameters);
};

TaisProvider.prototype.parseFares = parseFares;

module.exports = new TaisProvider();