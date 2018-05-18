const fs = require('fs');

const basicProvider = new require('./provider')(),
    profilesDir = __dirname + '/../profiles';

module.exports = () => {
    var profiles = {};
    var loadProfiles = (env) => {
        var profilesList = fs.readdirSync(profilesDir);

        profilesList.map(function (profileName) {
            profiles[profileName] = {};

            var profileListDir = profilesDir + '/' + profileName;
            if (fs.statSync(profileListDir).isDirectory()) {
                try {
                    var profileProviders = fs.readdirSync(profileListDir);
                    profileProviders.map(function(providerName) {
                        if (fs.statSync(profileListDir + '/' + providerName).isDirectory()) {
                            try {
                                var configFile = profileListDir + '/'
                                    + providerName + '/'
                                    + env + '/config.json';
                                profiles[profileName][providerName] = require(configFile);
                                loadCarrierFilter(profileName, providerName);
                                // console.debug('Загружен конфиг-файл %s / %s / %s (путь: %s)',
                                //   env,
                                //   profileName,
                                //   providerName,
                                //   configFile);
                            } catch (e) {
                                console.warn('Не удалось загрузить конфиг-файл %s / %s / %s. Ошибка: %s',
                                    env,
                                    profileName,
                                    providerName,
                                    e.stack);
                            }
                        }
                    });
                    profiles[profileName]['common'] = require(profileListDir + '/config.json');

                } catch (e) {
                    console.warn('Не удалось загрузить конфиг %s. Ошибка: %s',
                        profileName,
                        e.stack);
                }
            }
        });
    };

    /**
     * Формирует настройку фильтров по а\к
     */
    var loadCarrierFilter = (profileName, providerName) => {
        var carrierFilter = require(profilesDir + '/' + profileName + '/' + providerName + '/carriers.json');

        if (carrierFilter['all']) { // настройки для всех гдс
            if (carrierFilter['all']['deny']) {
                profiles[profileName][providerName]['denyAirlines'] = carrierFilter['all']['deny'];
            }

            if (carrierFilter['all']['allow']) {
                profiles[profileName][providerName]['allowAirlines'] = carrierFilter['all']['allow'];
            }

            if (carrierFilter['all']['untouch']) {
                profiles[profileName][providerName]['untouchAirlines'] = carrierFilter['all']['untouch'];
            }
        } else { // формируем gdsList
            profiles[profileName][providerName]['denyAirlines'] = {
                pairGDSCarrier: []
            };
            profiles[profileName][providerName]['allowAirlines'] = {
                pairGDSCarrier: [],
                gdsList: []
            };

            for (var gds in carrierFilter) {
                if (carrierFilter[gds]['deny']) {
                    profiles[profileName][providerName]['denyAirlines'].pairGDSCarrier
                        .push({
                            gds: gds,
                            carriers: carrierFilter[gds]['deny']
                        });
                }

                if (carrierFilter[gds]['allow']) {
                    profiles[profileName][providerName]['allowAirlines'].pairGDSCarrier
                        .push({
                            gds: gds,
                            carriers: carrierFilter[gds]['allow']
                        });
                    profiles[profileName][providerName]['allowAirlines'].gdsList
                        .push(gds);
                }
            }
        }
    };

    return {
        loadProfiles: (env) => loadProfiles(env),
        getProfile: () => profiles,
        getProviderProfile: function(profileName, providerName) {
            if (profiles[profileName][providerName] === undefined) {
                throw new Error('Не настроен профиль');
            }

            // добавляем общие настройки провайдера (например, код)
            let provider = basicProvider.getByDirectory(providerName);
            if (provider !== null) {
                profiles[profileName][providerName]['providerSettings'] = provider; // берем все из конфига по провайдеру
            }

            return profiles[profileName][providerName];
        }
    };
}