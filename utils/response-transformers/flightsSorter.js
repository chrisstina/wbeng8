const clone = require('clone');

const defaultPriority = ['DP', 'S7', 'TS', '1S', '2H', '1H', 'PB', '1G', 'TA'];//'3H', '4H', '5H', '6H', '7H',

/**
 * Cортируем результаты поиска: если попадаются одинаковые перелеты, берем тот, который дешевле.
 * Если попадаются одинаковые перелеты и цена совпадает, смотрим на приоритет в профайле.
 * код из старого wbeng
 * @param {Array} input [{data: {}, messages: [], provider: '', execTime: Date }]
 * @return {Object}
 */
module.exports = function(input) {
    var i,
        codes = {},
        returns = [],
        messages = [],
        profileData = {},
        localPriority = clone(defaultPriority); // @todo брать из конфига

    input.map(function (result) {
        if (result.data !== null) {
            result.data = result.data.filter(function (item) {
                return item;
            });
        }
        return result;
    });

    if (input.length > 1) {
        // проход по всем массивам с результатами от провайдеров
        // запоминаем, какой из провайдеров, под каким индексом
        for (i in input) {
            // если данные, вернувшиеся от провайдера, отсутствуют, то пропускаем
            if (input[i].data) {
                codes[input[i].provider] = i;
                // если провайдера не было в переданном приоритете
                // то добавим его в конец
                if (localPriority.indexOf(input[i].provider) < 0) {
                    localPriority.push(input[i].provider);
                }
            }
        };

        // уберём из приоритета то, что не вернулось из провайдеров
        localPriority = localPriority.filter(function (priority) {
            return codes.hasOwnProperty(priority);
        });

        returns = getUniqueFlights(input, codes, localPriority);
    } else {
        if (input[0] !== undefined && input[0].data) {
            returns.push(input[0].data);
        }
    }

    // форматируем вывод - код из старого wbeng
    input.map(function (result) {
        messages = messages.concat(result.messages);
    });

    returns = {
        data: [].concat.apply([], returns).filter(function (item) {
            return item;
        }),
        messages: messages,
    };

    return returns;
};

let getUniqueFlights = function(results, codes, localPriority) {
    var j, p, g, i, f, s, fareTotal, firstExpensive,
        leni = 0, lenf = 0, untouchable = false,
        returns = [], zipes = [], zip = '', zipSegment = [], zipFlights = [],
        zipObj, zipIti = [], zipLin = [], zipArr = [];

    // собрать линейный массив всевозможных вариантов
    for(p = 0; p < localPriority.length; p++) {
        if(results[codes[localPriority[p]]] && results[codes[localPriority[p]]].data) {
            for(g = 0; g < results[codes[localPriority[p]]].data.length; g++) {
                if(results[codes[localPriority[p]]].data[g] && results[codes[localPriority[p]]].data[g].itineraries) {
                    zipIti = [];
                    untouchable = (results[codes[localPriority[p]]].data[g].untouchable) ? true : false;
                    for(i = 0; i < results[codes[localPriority[p]]].data[g].itineraries.length; i++) {
                        if(results[codes[localPriority[p]]].data[g].itineraries[i].flights) {
                            zipFlights = [];
                            for(f = 0; f < results[codes[localPriority[p]]].data[g].itineraries[i].flights.length; f++) {
                                zipSegments = [];
                                if(results[codes[localPriority[p]]].data[g].itineraries[i].flights[f].segments) {
                                    for(s = 0; s < results[codes[localPriority[p]]].data[g].itineraries[i].flights[f].segments.length; s++) {
                                        zipSegments.push(getZipSegment(results[codes[localPriority[p]]].data[g].itineraries[i].flights[f].segments[s]));
                                    }
                                }
                                zipFlights.push(getZipFlight(zipSegments, i, f));
                            }
                            zipIti.push(zipFlights);
                        }
                    }

                    zipLin = multiplicateArray(zipIti);
                    lenf = zipLin.length;

                    for(f = 0; f < lenf; f++) {
                        leni = zipLin[f].length;
                        zipArr = [];
                        for(i = 0; i < leni; i++) {
                            zipArr.push(zipLin[f][i].zip);
                        }
                        zip = zipArr.join('=');

                        fareTotal = (results[codes[localPriority[p]]].data[g].fares.fareTotal) ? parseFloat(results[codes[localPriority[p]]].data[g].fares.fareTotal) : 0;
                        zipObj = getZipObj(zip, fareTotal, p, g, zipLin[f], untouchable);

                        zipes.push(zipObj);
                    }
                }
            }
        }
    }

    // найти дубликаты и сравнить их
    leni = zipes.length;
    var reisa = '', reisb = '';
    for(i = 0; i < leni; i++) {
        if(zipes[i].dublicate) { continue; }
        //reisa = zipes[i].zip.substr(6, 6);
        for(j = (i + 1); j < leni; j++) {
            if(zipes[j].dublicate) { continue; }

            //reisb = zipes[j].zip.substr(6, 6);
            //if(reisa == 'SU6004' && reisb == 'SU6004') { console.log('SU6004 double find'); }

            if(zipes[i].zip != zipes[j].zip) {
                continue;
            }
            /*if(reisa == 'SU6004' && reisb == 'SU6004') {
                console.log('SU6004 eq');
                console.log('SU6004 ' + zipes[i].provider + ', reisa: ' + zipes[i].zip + ', sum: ' + zipes[i].fareTotal);
                console.log('SU6004 ' + zipes[j].provider + ', reisb: ' + zipes[j].zip + ', sum: ' + zipes[j].fareTotal);
            }*/
            //firstExpensive = isFirstExpensive(zipes[i].fareTotal, zipes[j].fareTotal);
            if(zipes[i].fareTotal > zipes[j].fareTotal) {
                //if(firstExpensive) {
                zipes[i].dublicate = true;
            } else {
                zipes[j].dublicate = true;
            }
        }
    }
    // построить ответ из недублированных вариантов
    var nodublicates = {};
    for(j = 0; j < leni; j++) {
        p = 'p' + zipes[j].provider;
        g = 'g' + zipes[j].group;
        if(!nodublicates[p]) { nodublicates[p] = {}; }
        if(!nodublicates[p][g]) { nodublicates[p][g] = {}; }
        for(i = 0; i < zipes[j].itineraries.length; i++) {
            ic = 'i' + zipes[j].itineraries[i].i;
            f = 'f' + zipes[j].itineraries[i].f;
            if(!nodublicates[p][g][ic]) { nodublicates[p][g][ic] = {}; }
            if(!nodublicates[p][g][ic][f]) { nodublicates[p][g][ic][f] = false; }
            if(!zipes[j].dublicate || zipes[j].untouchable) { nodublicates[p][g][ic][f] = true; }
        }
    }

    for(p = 0; p < localPriority.length; p++) {
        if(results[codes[localPriority[p]]] && results[codes[localPriority[p]]].data) {
            for(g = 0; g < results[codes[localPriority[p]]].data.length; g++) {
                if(results[codes[localPriority[p]]].data[g] && results[codes[localPriority[p]]].data[g].itineraries) {
                    for(i = 0; i < results[codes[localPriority[p]]].data[g].itineraries.length; i++) {
                        if(results[codes[localPriority[p]]].data[g].itineraries[i].flights) {
                            for(f = 0; f < results[codes[localPriority[p]]].data[g].itineraries[i].flights.length; f++) {
                                if(!nodublicates['p' + p]['g' + g]['i' + i]['f' + f]) {
                                    results[codes[localPriority[p]]].data[g].itineraries[i].flights[f] = null;
                                }
                            }
                        }
                    }
                }
            }
        }

        // убираем пустые резальтаты
        var filteredData = clone(results[codes[localPriority[p]]].data);
        filteredData = results[codes[localPriority[p]]].data.filter(function(data) {
            if(data && data.itineraries) {
                for(itinIdx = 0; itinIdx < data.itineraries.length; itinIdx++) {
                    if(data.itineraries[itinIdx].flights) {
                        for(flightIdx = 0; flightIdx < data.itineraries[itinIdx].flights.length; flightIdx++) {
                            if(data.itineraries[itinIdx].flights[0] === null) {
                                return false;
                            }
                        }
                    }
                }
            }

            return true;
        });

        if(filteredData) {
            returns.push(filteredData);
        }
    }

    return returns;
};

let multiplicateArray = function (arr) {
    var result = [], mediate = [], lena = 0, v = [], a = 0, f = 0, j = 0;
    var leni = arr.length;

    var lenf = arr[0].length;
    for(f = 0; f < lenf; f++) {
        v = [];
        v.push(arr[0][f]);
        result.push(v);
    }
    for(i = 1; i < leni; i++) {
        lenf = arr[i].length;
        lena = result.length;
        mediate = [];
        for(f = 0; f < lenf; f++) {
            for(a = 0; a < lena; a++) {
                v = [];
                for(j = 0; j < i; j++) { v.push(result[a][j]); }
                v.push(arr[i][f]);
                mediate.push(v);
            }
        }
        result = mediate;
    }
    return result;
};


let getZipObj = function(zip, price, provider, group, itineraries, untouchable) {
    var obj = {};
    obj.zip = zip;
    obj.fareTotal = price;
    obj.provider = provider;
    obj.group = group;
    obj.itineraries = itineraries;
    obj.dublicate = false;
    obj.untouchable = (untouchable) ? true : false;
    return obj;
};
let fulli = function(s, n) {
    var r = '';
    if(s) { r += s; }
    for(var i = 0; i < n; i++) {
        r += ' ';
    }
    var q = r.substr(0, n);
    return q;
};
let getZipSegment = function (segment) {
    let zip = '';
    zip += fulli(segment.locationBegin.code, 3);
    zip += fulli(segment.locationEnd.code, 3);
    zip += fulli(segment.carrier.code, 2);
    zip += fulli(segment.flightNumber, 4);
    zip += fulli(segment.bookingClass, 1);
    let d = segment.dateBegin.split('+')[0];
    zip += fulli(d, 10);
    if(segment.fareBasis && segment.fareBasis.length > 2) {
        zip += segment.fareBasis.slice(0, 3);
    }
    return zip;
};
let getZipFlight = function(zipSegments, i, f) {
    let obj = {};
    obj.zip = zipSegments.join('-');
    obj.i = i;
    obj.f = f;
    return obj;
};