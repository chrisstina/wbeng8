module.exports = {
    name: 'WBENG API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    providers: [
        {
            code: '1S',
            name: 'Sabre',
            directory: 'sabre', // название папки конфигов этого провайдера
            engine: 'sabre' // папка с обработчиком API поставщика
        },
        {
            code: '2S',
            name: 'Sabre KZ',
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
            name: 'TAIS 1A',
            directory: 'tais1A',
            engine: 'tais'
        },
        {
            code: 'TS',
            name: 'TAIS SI',
            directory: 'taisSi',
            engine: 'tais'
        },
        {
            code: 'PB',
            name: 'Portbilet',
            directory: 'portbilet',
            engine: 'portbilet'
        },
        {
            code: 'DP', // только а\к Победа
            name: 'Portbilet DP',
            directory: 'portbiletDP',
            engine: 'portbilet'
        }
    ],
    operations: [
        {
            name: 'flights', // по этому имени ищется файл в [provider]/operations
            exit: 'flightGroups', // это поле подставляется во время форматирования ответа (legacy)
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
    ]
}