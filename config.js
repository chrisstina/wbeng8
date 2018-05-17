module.exports = {
    name: 'WBENG API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    providers: {
        '1S': 'sabre',
        'TA': 'tais',
        'TS': 'tais'
    }
}