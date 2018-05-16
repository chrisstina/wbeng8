module.exports = {
    encode: (obj) => {
        if (obj.hasOwnProperty('seats')) {
            obj.seats = encodeSeats(obj.seats);
        }
        return new Buffer(JSON.stringify(obj)).toString('base64');
    },

    decode: (str) => {
        if (str === '') return {};
        var buf = new Buffer(str, 'base64');
        var json = JSON.parse(buf.toString());
        if (json.hasOwnProperty('seats')) {
            json.seats = decodeSeats(json.seats);
        }
        return json;
    }
};

function encodeSeats(seats) {
    var result = [];
    if (seats) {
        for (var i = 0; i < seats.length; i++) {
            result.push(seats[i].passengerType[0] + seats[i].count);
        }
    }
    return result.join('|');
}

function decodeSeats(seats) {
    var result = [];
    if (seats) {
        seats = seats.split('|');
        for (var i = 0; i < seats.length; i++) {
            seats[i] = seats[i].match(/([ACIYSW]{1})([0-9]+)/);
            result.push({
                count: seats[i][2],
                passengerType: seats[i][1].replace('A', 'ADULT').replace('I', 'INFANT').replace('C', 'CHILD').replace('Y', 'YOUTH').replace('S', 'SENIOR').replace('W', 'WSEATINFANT')
            });
        }
    }
    return result;
}