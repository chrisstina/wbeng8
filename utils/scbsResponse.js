/**
 * Подготавливает ответ системы для вывода в нужном формате
 */

/**
 * Created by kostya on 28.07.14.
 */
var scbsMessenger = require('./scbsMessenger'),
    scbsValidator = require('./scbsValidator');

module.exports.wrapResponse = function (result, exitPoint, token, profile) {
    let response = {
        token: token,
        messages: result.messages,
        context: {
            version: 1,
            environment: 1,
            profile: profile
        }
    };

    response[exitPoint] = result.data;
    return this.response(response);
};

module.exports.request = function (parameters, entryPoint, context) {
    switch (entryPoint) {
        case 'book':
            parameters = bookInput(parameters);
            break;
        case 'price':
        case 'flightfares':
            parameters = priceInput(parameters);
            break;
        case'ticket':
            parameters = ticketInput(parameters);
            break;
        case 'cancel':
            parameters = cancelInput(parameters);
            break;
        case 'fares':
            parameters = faresInput(parameters);
            break;
    }

    return parameters;
};

module.exports.errorResponse = function (e) {
    let result = {
        messages: {
            message: []
        }
    };

    result.messages.message.push({
        type: 'ERROR',
        source: 'WBENG',
        message: e.stack.split("\n")[0].trim() + ' ' + e.stack.split("\n")[1].trim()
    });

    try {
        result.messages.message = scbsMessenger.filterMessages(result.messages.message);
    } catch (e) {
        result.messages.message.push({
            type: 'ERROR',
            source: 'SCBSMESSENGER',
            message: 'scbsMessenger error: ' + e.stack.split("\n")[0].trim() + ' ' + e.stack.split("\n")[1].trim()
        });
    }

    return result;
};

module.exports.response = function (result) {
    result.messages = {
        message: result.messages
    };

    try {
        for (var key in result) {
            if ((!result.hasOwnProperty(key)) || (['messages', 'token'].indexOf(key) > -1)) continue;
            switch (key) {
                case 'flightGroups':
                    result.flightsGroup = {
                        flightGroup: flightGroupsOutput(result.flightGroups)
                    };
                    delete result.flightGroups;
                    break;
                case 'bookingFile':
                    result.bookingFile = bookingFileOutput(result.bookingFile);
                    break;
                case 'remarkGroups':
                    result.remarkGroups = {
                        remarkGroup: remarkGroupsOutput(result.remarkGroups)
                    };
            }
        }
    } catch (e) {
        result.messages.message.push({
            type: 'ERROR',
            source: 'LEGACY',
            message: 'Legacy error: ' + e.stack.split("\n")[0].trim() + ' ' + e.stack.split("\n")[1].trim()
        });
    }

    try {
        result.messages.message = scbsMessenger.filterMessages(result.messages.message);
    } catch (e) {
        result.messages.message.push({
            type: 'ERROR',
            source: 'scbsMessenger',
            message: 'scbsMessenger error: ' + e.stack.split("\n")[0].trim() + ' ' + e.stack.split("\n")[1].trim()
        });
    }

    return result;
};

function priceInput(parameters) {
    var i, j, k;
    if (parameters.flightsGroup) {
        parameters.token = parameters.flightsGroup.flightGroup[0].token;
        parameters.flightGroups = parameters.flightsGroup.flightGroup;
        for (i = 0; i < parameters.flightGroups.length; i++) {
            parameters.flightGroups[i].itineraries = parameters.flightGroups[i].itineraries.itinerary;
            for (j = 0; j < parameters.flightGroups[i].itineraries.length; j++) {
                parameters.flightGroups[i].itineraries[j].flights = parameters.flightGroups[i].itineraries[j].flights.flight;
                for (k = 0; k < parameters.flightGroups[i].itineraries[j].flights.length; k++) {
                    if (parameters.flightGroups[i].itineraries[j].flights[k].segments) {
                        parameters.flightGroups[i].itineraries[j].flights[k].segments = parameters.flightGroups[i].itineraries[j].flights[k].segments.segment;
                    }
                }
            }
        }
        delete parameters.flightsGroup;
    }

    return parameters;
}

function bookInput(parameters) {
    var i;

    if (parameters.passengers) {
        parameters.passengers = parameters.passengers.passenger;
    }

    for (i in parameters.passengers) {
        scbsValidator.validateAge(parameters.passengers[i].passport, parameters.passengers[i].type,
            function(errorText) {
                throw Error(errorText);
            }
        );
    }

    //parameters.token = parameters.flightsGroup.flightGroup[0].token;
    parameters = priceInput(parameters);
    return parameters;
}

function ticketInput(parameters) {
    if (parameters.corrective && parameters.corrective.prices) {
        parameters.corrective.prices = parameters.corrective.prices.price;
    }
    parameters = bookInput(parameters);
    return parameters;
}

function faresInput(parameters) {
    parameters = ticketInput(parameters);
    return parameters;
}

function cancelInput(parameters) {
    parameters = ticketInput(parameters);
    return parameters;
}

function bookingFileOutput(bookingFile) {
    var i, j, k, l;

    if (Object.prototype.toString.call(bookingFile) === '[object Array]') {
        bookingFile = bookingFile[0];
    }

    if (bookingFile === undefined) {
        return {};
    }

    if (!bookingFile.reservations) {
        return bookingFile;
    }

    for (i = 0; i < bookingFile.reservations.length; i++) {

        bookingFile.documents = {
            document: bookingFile.documents
        };

        if (bookingFile.reservations[i].products) {
            bookingFile.reservations[i].products.airTicket = bookingFile.reservations[i].products.airTickets;
            delete bookingFile.reservations[i].products.airTickets;

            // “l”: beginning of “airTicket” loop
            for (l = 0; l < bookingFile.reservations[i].products.airTicket.length; l++) {

                if (bookingFile.reservations[i].products.airTicket[l].fares) {
                    if (bookingFile.reservations[i].products.airTicket[l].fares.fareSeats) {
                        for (j = 0; j < bookingFile.reservations[i].products.airTicket[l].fares.fareSeats.length; j++) {
                            bookingFile.reservations[i].products.airTicket[l].fares.fareSeats[j].prices = {
                                price: bookingFile.reservations[i].products.airTicket[l].fares.fareSeats[j].prices
                            };
                        }
                    }
                    bookingFile.reservations[i].products.airTicket[l].fares.fareSeats = {
                        fareSeat: bookingFile.reservations[i].products.airTicket[l].fares.fareSeats
                    };
                }
                // “j”: beginning of “reservations” loop
                for (j = 0; j < bookingFile.reservations[i].products.airTicket[l].itineraries.length; j++) {
                    if (bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights) {
                        // “k”: beginning of “segments” loop
                        for (k = 0; k < bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights.length; k++) {
                            bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights[k].segments = {
                                segment: bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights[k].segments
                            };
                        } // “k”: end of “segments” loop
                    }
                    bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights = {
                        flight: bookingFile.reservations[i].products.airTicket[l].itineraries[j].flights
                    };
                } // “j”: end of “itineraries” loop
                bookingFile.reservations[i].products.airTicket[l].itineraries = {
                    itinerary: bookingFile.reservations[i].products.airTicket[l].itineraries
                };
            } // “l”: end of “airTicket” loop
        }
    } // “i”: end of “reservations” loop

    bookingFile.reservations = {
        reservation: bookingFile.reservations
    };

    return bookingFile;
}

function remarkGroupsOutput(remarkGroups) {
    var i;
    if (Object.prototype.toString.call(remarkGroups) !== '[object Array]') {
        remarkGroups = [remarkGroups];
    }
    for (i = 0; i < remarkGroups.length; i++) {
        remarkGroups[i].messages = {
            message: remarkGroups[i].messages
        };
        remarkGroups[i].remarks = {
            remark: remarkGroups[i].remarks
        };
        remarkGroups[i].segmentToken = {
            remark: remarkGroups[i].remarkToken
        };
    }
    return remarkGroups;
}

function flightGroupsOutput(flightGroup) {
    var i, j, k;
    for (i = 0; i < flightGroup.length; i++) {
        if (flightGroup[i].fares !== undefined) { // для вывода расписаний fares не смотрим
            flightGroup[i].fares.fareTotal = {
                total: flightGroup[i].fares.fareTotal
            };

            flightGroup[i].fares.fareSeats = {
                fareSeat: flightGroup[i].fares.fareSeats
            };

            for (j = 0; j < flightGroup[i].fares.fareSeats.fareSeat.length; j++) {
                flightGroup[i].fares.fareSeats.fareSeat[j].prices = {
                    price: flightGroup[i].fares.fareSeats.fareSeat[j].prices
                };
            }
        }

        for (j = 0; j < flightGroup[i].itineraries.length; j++) {

            for (k = 0; k < flightGroup[i].itineraries[j].flights.length; k++) {
                if (flightGroup[i].itineraries[j].flights[k] !== null) {
                    flightGroup[i].itineraries[j].flights[k].segments = {
                        segment: flightGroup[i].itineraries[j].flights[k].segments
                    };
                }
            }
            flightGroup[i].itineraries[j].flights = {
                flight: flightGroup[i].itineraries[j].flights
            };
        }

        flightGroup[i].itineraries = {
            itinerary: flightGroup[i].itineraries
        };
    }
    return flightGroup;
}