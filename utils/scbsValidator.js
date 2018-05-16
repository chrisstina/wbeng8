const util = require('util');

const ERRORTEXT = {
    MISSING_DATA: "Отсутствуют данные пассажира %s",
    INVALID_AGE_CODE: "Задан некорректный тип пассажира для %s. Ожидается тип %s.",
    INVALID_DISCOUNT_AGE_CODE: "Задан некорректный тип пассажира для %s. Молодежь: от 12 до 23 полных лет, пенсионеры: от 60 лет."
};

const AGECODES = {
    ADULT: 2,
    CHILD: 1,
    INFANT: 0
};

const DISCOUNTED_AGECODES = ['YOUTH', 'SENIOR'];

var scbsValidator = (function () {

    function scbsValidator() {
    }

    scbsValidator.prototype.validateAge = function (passengerData, passengerType, errorCallback) {
        let passengerName = passengerData.firstName + ' ' + passengerData.lastName,
            age = getAge(passengerData.birthday);

        var expectedType;

        if (passengerType !== undefined && DISCOUNTED_AGECODES.indexOf(passengerType) !== -1) { // субсидии
            expectedType = getDiscountedTypeByAge(age);
            if (expectedType !== passengerType) {
                errorCallback(util.format(ERRORTEXT.INVALID_DISCOUNT_AGE_CODE, passengerName));
            }
        } else if (passengerType !== undefined && passengerData.birthday !== undefined) { // обычные категории граждан
            expectedType = getTypeByAge(age);
            if (AGECODES[expectedType] > AGECODES[passengerType]) {
                errorCallback(util.format(ERRORTEXT.INVALID_AGE_CODE, passengerName, expectedType));
            }
        } else {
            errorCallback(util.format(ERRORTEXT.MISSING_DATA, passengerName));
        }
    };

    /**
     * Возвращает тип пассажира по возрасту - для субсидированных тарифов
     */
    let getDiscountedTypeByAge = function (age) {
        if (age >= 12 && age <= 23)
            return 'YOUTH';
        if (age >= 55)
            return 'SENIOR';
        return null;
    };

    /**
     * Возвращает тип пассажира по возрасту. Передается количество полных лет
     */
    let getTypeByAge = function (age) {
        if (age <= 2)
            return 'INFANT';
        if (age <= 12)
            return 'CHILD';
        return 'ADULT';
    };

    let getAge = function (dateString) {
        var age, monthDiff;
        let today = new Date(),
            birthDate = new Date(dateString);

        age = today.getFullYear() - birthDate.getFullYear();
        monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    };

    return new scbsValidator();
})();

module.exports = scbsValidator;
