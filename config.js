module.exports = {
    name: 'WBENG API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    logDirectory: 'log/providerMessages/',
    logLocal: true, // сохранять ли файлы с xml локально
    logRemote: false, // отправлять ли логи в wbControl
    providers: [
        {
            code: '1S',
            name: 'SABRE',
            directory: 'sabre', // название папки конфигов этого провайдера
            engine: 'sabre' // папка с обработчиком API поставщика
        },
        {
            code: '2S',
            name: 'SABREKZ',
            directory: 'sabreKZ',
            engine: 'sabre'
        },
        {
            code: 'TA',
            name: 'TAIS',
            directory: 'tais',
            engine: 'tais'
        },
        {
            code: '1A',
            name: 'AMADEUS',
            directory: 'tais1A',
            engine: 'tais'
        },
        {
            code: 'TS',
            name: 'SIAM',
            directory: 'taisSi',
            engine: 'tais'
        },
        {
            code: 'PB',
            name: 'PORTBILET',
            directory: 'portbilet',
            engine: 'portbilet'
        },
        {
            code: 'DP', // только а\к Победа
            name: 'Portbilet DP',
            directory: 'portbiletDP',
            engine: 'portbilet'
        },
        {
            code: '1G',
            name: 'TRAVELPORT',
            directory: 'travelport',
            engine: 'travelport'
        },
        {
            code: '2G',
            name: 'TRAVELPORTKZ',
            directory: 'travelportKZ',
            engine: 'travelport'
        },
        // {
        //     code: '1H',
        //     name: 'SIRENA',
        //     directory: 'sirena',
        //     engine: 'sirena'
        // },
    ],
    operations: [
        {
            name: 'flights', // по этому имени ищется файл в [provider]/operations
            exit: 'flightGroups', // это поле подставляется во время форматирования ответа (legacy)
            transformers: [ // эти методы будут применены к ответу каждого провайдера
                'addAlternativeFareFlag', // добавляет флаг доп. тарифов
                'addCustomTaxes', // добавляет zzTax из настроек профайла
            ]
        },
        // {
        //     name: 'matrix',
        //     exit: 'flightGroups',
        // },
        // {
        //     name: 'flightfares',
        //     exit: 'flightGroups',
        // },
        // {
        //     name: 'schedule',
        //     exit: 'flightGroups',
        // },
        // {
        //     name: 'price',
        //     exit: 'bookingFile',
        //    transformers: [
        //     'addCustomTaxes',
        //     'convertToRUB'
        // ]
        // },
        // {
        //     name: 'book',
        //     exit: 'bookingFile',
        // },
        // {
        //     name: 'ticket',
        //     exit: 'bookingFile',
        // },
        // {
        //     name: 'display',
        //     exit: 'bookingFile',
        // },
        // {
        //     name: 'cancel',
        //     exit: 'bookingFile',
        // },
        // {
        //     name: 'void',
        //     exit: 'bookingFile',
        // },
        // {
        //     name: 'fares',
        //     exit: 'remarkGroups',
        // },
    ],
    transformers: {
        'addAlternativeFareFlag': require('./utils/response-transformers/altFaresAllower'),
        'addCustomTaxes': require('./utils/response-transformers/customTaxModifier'),
    },
    alternativeFaresAllowed: [ // выводить ли кнопку "Все тарифы"
        { gds: 'SIRENA', carriers: ['UT', 'NN', 'WZ', 'N4', 'IK', '5N', 'Y7', 'SU', 'УТ', 'R3', '2G', 'FV', '6R'] },
        { gds: 'SABRE', carriers: ['*'] },
        { gds: 'GALILEO', carriers: ['*'] },
        { gds: 'AMADEUS', carriers: ['*'] }
    ]
};