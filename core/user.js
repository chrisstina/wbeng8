const crypto = require('crypto'),
    iplib = require('ip'),
    errors = require('restify-errors');

var scbsUser = (function() {
  	var self, username, profiles;

    function scbsUser() {
      self = this;
	}

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    scbsUser.prototype.authorizeProfile  = function(req, res, next) {
        var profile = self.getProfile(
            req.params.context.login,
            req.params.context.password,
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            req.getPath().replace('\/', ''));

        if (profile !== undefined) {
            req.userProfile = profile;
            next();
        } else {
            next(new errors.ForbiddenError('В контексте не указан пользователь, либо ошибка авторизации!'));
        }
    };

    /**
     *
     * @param username
     * @param plainPassword
     * @param ip
     * @param operation
     * @returns {((reportName?: string) => void) | string}
     */
    scbsUser.prototype.getProfile = function(username, plainPassword, ip, operation) {
        var i, allUsers = require(__dirname + '/../../users.json');
        for (i in allUsers) {
            if (allUsers[i].username === username && allUsers[i].password === self.encryptPassword(plainPassword)){
                var isLocal = process.env.NODE_ENV === 'unittest';
                // isLocal = (ip == '127.0.0.1');//||(ip.slice(0,7) == '192.168'); //жестоко и беспощадно
                if (isLocal || validateUserRules(allUsers[i].rules, ip, operation)){
                    return allUsers[i].profile;
                }
            }
        }
    };

    scbsUser.prototype.encryptPassword = function(password) {
      return crypto.createHmac('sha1', 'wbeng').update(password).digest('hex');
    };
    
    scbsUser.prototype.getSalt = function() {
      return Math.round((new Date().valueOf() * Math.random())) + '';
    };

    ///точка входа валидации правил пользователя
    function validateUserRules(rules, ip, operation){
        //есс-но если правила есть
        if (rules && rules.length) {
            //валидируем каждое из них
            for (var i in rules) {
                //и если хотя бы одно прошло валидацию
                if (validateUserRule(rules[i], ip, operation)) {
                   return true; // говорим что все ок
                }
            }
            // посылаем реквестера обратно в злобную нору если не одно не прошло
            return false;
        }
        return true; // если правил нет, то все ок (нет правил - нет проверки)
    }

    // валидация одного из правил
    // у каждого праила есть свои категории: ip , time, deny_operations
    // правила ip, времени, и запрещенные операции соответственно
    function validateUserRule(rule, ip, operation){
        var ipPassed = passIp(rule['ip'], ip);
        var timePassed = passTime(rule['time']);
        var operationPassed = passOperations(rule['deny_operations'], operation);

        // дожны пройти все категории правила
        return ipPassed && timePassed && operationPassed;
    }

    // валидация правил категории ip
    // есть несколько типов правил ip - список, диапазон, подсеть и маска
    // логика следующая - запрещены все запрещенные + те которые не разрешенны
    function passIp(rules, ip){
        // если они имеются
        if (!rules.length) {
            //сначала смотрим запреты, если они есть
            if (rules.hasOwnProperty('deny')) {
                //проходим по всем запретным и в зависимости от типа пытаемся проверить то или инное ip правило
                for (var i in rules['deny']) {
                    switch (rules['deny'][i]['type']){
                        case 0:
                            if (passIpList(rules['deny'][i]['list'],ip)){ //если правило прошло значит это не правильно
                                log.warning("Пользователь не прошел проверку в списке запрещенных IP - список");
                                return false; // возвращаем кукиш
                            }
                            break;
                        case 1:
                            if (passIpRange(rules['deny'][i]['begin'],rules['deny'][i]['end'],ip)){
                                log.warning("Пользователь не прошел проверку в списке запрещенных IP - диапазон");
                                return false;
                            }
                            break;
                        case 2:
                            if (passIpSubnet(rules['deny'][i]['subnet'],ip)){
                                log.warning("Пользователь не прошел проверку в списке запрещенных IP - подсеть");
                                return false;
                            }
                            break;
                        case 3:
                            if (passIpMask(rules['deny'][i]['mask'],ip)){
                                log.warning("Пользователь не прошел проверку в списке запрещенных IP - маска");
                                return false;
                            }
                            break;
                    }
                }
            }
            // затем проходим по разрешенным, если они имеются
            if (rules.hasOwnProperty('allow')) {
                for (var i in rules['allow']) {
                    switch (rules['allow'][i]['type']){
                        case 0:
                            if (!passIpList(rules['allow'][i]['list'],ip)){ // если правило не разрешено - то оно запрещено
                                log.warning("Пользователь не прошел проверку в списке разрешенных IP - список");
                                return false;
                            }
                            break;
                        case 1:
                            if (!passIpRange(rules['allow'][i]['begin'],rules['allow'][i]['end'],ip)){
                                log.warning("Пользователь не прошел проверку в списке разрешенных IP - диапазон");
                                return false;
                            }
                            break;
                        case 2:
                            if (!passIpSubnet(rules['allow'][i]['subnet'],ip)){
                                log.warning("Пользователь не прошел проверку в списке разрешенных IP - подсеть");
                                return false;
                            }
                            break;
                        case 3:
                            if (!passIpMask(rules['allow'][i]['mask'],ip)){
                                log.warning("Пользователь не прошел проверку в списке разрешенных IP - маска");
                                return false;
                            }
                            break;
                    }
                }
            }
        }
        return true;
    }

    // проверка на принадлежность ip  к списку
    function passIpList(list, ip) {
        if (list && list.length){
            return !!(list.indexOf(ip) + 1); //в списке - true
        }
        return true;
    }
    // проверка на принадлежность ip к диапазону
    function passIpRange(from, to, ip) {
        var low = iplib.toLong(from); // приводим ip  к числу
        var high =iplib.toLong(to); // приводим ip  к числу
        var mustMiddle = iplib.toLong(ip); // приводим ip  к числу

        return low<=mustMiddle && mustMiddle >= high; // возвращаем находится ли наш ip в диапазоне
    }
    // проверка на принадлежность ip к подсети
    function passIpSubnet(subnet, ip) {
        return iplib.cidrSubnet(subnet).contains(ip);
    }
    // проверка на совпадение ip с маской
    function passIpMask(mask, ip) {
        // экранируем точки, а звездочки меняем на (нужен один любой символ)
        var expression = mask.replace(/\./g,'\\.').replace(/\*/g,'.+');
        // бацаем из выражения регулярку
        var regexp = new RegExp(expression);
        // и возвращаем соответствие ip регулярке
        return ip.match(regexp, ip);
    }

    // проверка на категорию правила времени
    // логика следующая - запрещены все запрещенные + те которые не разрешенны
    function passTime(rules){
        if (rules['deny'] && rules['deny'].length){
            for (var i in rules['deny']){
                if (passTimeRule(rules['deny'][i])){
                    log.warning("Пользователь не прошел проверку в запрещенном списке времени");
                    return false;
                }
            }
        }
        if (rules['allow'] && rules['allow'].length){
            for (var i in rules['allow']) {
                if (!passTimeRule(rules['allow'][i])) {
                    log.warning("Пользователь не прошел проверку в разрешенном списке времени");
                    return false;
                }
            }
        }
        return true;
    }
    // Проверяем одно правило времни
    // должно содержать промежуток времени с(from) и по(to)
    // также могут присутствовать дни недели (days)
    function passTimeRule(rule){
        var date = new Date();
        // если есть дни недели
        if (rule.days && rule.days.length){
            // смотрим если текущий день недели не в списке
            if (!(rule.days.indexOf(date.getDay()+'')+1)){
                return false; // то не прошло
            }
        }
        var from = rule.from.split(':');
        var to = rule.to.split(":");
        var fromMinutes = from[0]*60 + from[1]*1; //получаем количество минут с
        var toMinutes = to[0]*60 + to[1]*1; //получаем количество минут по
        var minutes =  date.getHours()*60 + date.getMinutes()*1;  //получаем количество минут текущего времени
        return fromMinutes <= minutes && toMinutes > minutes; // возвращаем пренадлежит ли текущее время промежутку
    }

    //Проверка запрещенных операций
    function passOperations(operations, operation){
        if (operations && operations.length){
            var result = !(operations.indexOf(operation) + 1); //если операция в списке возвращаем что правило не прошло
            if (!result){
                log.warning("Пользователю запрещено проводить операцию " + operation + " правилами.");
            }
            return result;
        }
        return true;
    }
    
    return new scbsUser();
})();

module.exports = scbsUser;
