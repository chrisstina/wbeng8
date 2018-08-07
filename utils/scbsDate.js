var moment = require('moment-timezone');
var scbsDate = (function() {
    return {
        /**
         * Вернет дату в формате 2014-06-28T19:30:19+03:00
         * Учитывает переданный часовой пояс.
         *
         * @param {Date} dateString
         * @param {String} timezone
         * @returns {String}
         */
        formatISODate: (dateString, timezone) => {
            if (timezone === undefined) {
                timezone = 'Europe/Kaliningrad';
            }
            return moment.tz(dateString, timezone).format();
        },
        formatShortDate: (dateString) => {
            return moment(dateString).format('MM-DD');
        }
    };
})();

module.exports = scbsDate;