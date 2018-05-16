var scbsMessenger = (function() {
	var self;
	function scbsMessenger() {
		self = this;
		
		self.UNDEF = 0;
		self.DEBUG = 1; // отладка (debug), 
		self.INFO = 2; // информация (info), 
		self.NOTICE = 3; // замечание (notice), 
		self.WARNING = 4; // предупреждение (warning), 
		self.ERROR = 5; // ошибка (error), 
		self.CRITICAL = 6; // критическая ошибка (critical), 
		self.ALERT = 7; // тревога (alert), 
		self.EMERGENCY = 8; // авария (emergency)
		self.FORUSER = 9; // Ошибки, которые показываются пользователю
		
		self.INPUT = new Array();
		// элемент массива: [искомая строка, [коды выходных ошибок]]
		self.INPUT.push(['PQ RECORD NUMBER NOT VALID', [301, 901, 922]]);
		self.INPUT.push(['НЕ УДАЛОСЬ ПОДТВЕРДИТЬ МЕСТА В АВИАКОМПАНИИ', [302, 901, 921, 992]]);
		self.INPUT.push(['НЕВОЗМОЖНО ЗАБРОНИРОВАТЬ И ОЦЕНИТЬ PNR', [304, 901, 922]]);
		self.INPUT.push(['НЕВОЗМОЖНО ПОЛУЧИТЬ МЕСТА НА РЕЙСЕ', [305, 901, 921]]);
		self.INPUT.push(['НЕТ МЕСТ НА РЕЙСЕ, ЛИСТЫ ОЖИДАНИЯ НЕ ПОДДЕРЖИВАЮТСЯ', [303, 901, 921]]);
		self.INPUT.push(['0 AVAIL/WL CLOSED', [303, 901, 923]]);
		self.INPUT.push(['PNR ЗАНЯТО ДРУГИМ ПОЛЬЗОВАТЕЛЕМ', [201, 601, 901, 924]]);
        self.INPUT.push(['THE PNR IS BLOCKED BY ANOTHER USER', [201, 601, 901, 924]]);
		self.INPUT.push(['ВРЕМЯ ВЫПОЛНЕНИЯ ОПЕРАЦИИ ИСТЕКЛО. ВОЗМОЖЕН ТОЛЬКО ВОЗВРАТ', [306, 901, 925]]);
		self.INPUT.push(['СУММА ОПЛАТЫ НЕ СОВПАДАЕТ С СУММОЙ ЗАКАЗА', [202, 602, 901, 926]]);
		self.INPUT.push(['PARSE ERROR: TYPEERROR: CANNOT CALL METHOD \'GET\' OF UNDEFINED AT SIRENA.GETNODETEXT', [501, 508, 902, 992]]);
		self.INPUT.push(['SOAPFAULTEXCEPTION: INVALID OR EXPIRED BINARY SECURITY TOKEN', [308, 901, 927, 992]]);
		self.INPUT.push(['ДЛЯ ВЫБРАННОЙ ПЕРЕВОЗКИ ИМЕНА ПАССАЖИРОВ ДОЛЖНЫ ЗАДАВАТЬСЯ ЛАТИНИЦЕЙ', [307, 901, 940, 943]]);
		self.INPUT.push(['START TAG EXPECTED, \'<\' NOT FOUND', [502, 902]]);
		self.INPUT.push(['PARSE ERROR: TYPEERROR: OBJECT #<OBJECT> HAS NO METHOD \'get\' AT PORTBILET.GETNODETEXT', [502, 101, 902]]);
		self.INPUT.push(['ОТМЕНА БРОНИРОВАНИЯ НЕВОЗМОЖНА, СОЗДАНА ЗАЯВКА', [504, 604, 928]]);
		self.INPUT.push(['BOOKING SUM INCREASE', [202, 602, 901, 926]]);
		self.INPUT.push(['КЛАСС ОТСУТСТВУЕТ', [304, 901, 922]]);
		self.INPUT.push(['UNABLE - FLIGHT NOT FOUND IN VENDOR SYSTEM', [309, 101, 901, 927]]);
		self.INPUT.push(['ПРОДАЖА ЗАПРЕЩЕНА', [304, 901]]);
		self.INPUT.push(['ERROR: SOCKET HANG UP', [503, 101, 902, 992]]);
		self.INPUT.push(['FILED FARE HAS BEEN INVALIDATED', [301, 922]]);
		self.INPUT.push(['FARE CREATION ERROR:NO VALID FARE FOR INPUT CRITERIA', [301, 922]]);
		self.INPUT.push(['XML ERROR: ERROR: PREMATURE END OF DATA IN TAG', [502, 902, 992]]);
		self.INPUT.push(['PARSE ERROR: TYPEERROR: CANNOT CALL METHOD \'GET\' OF UNDEFINED AT BOOK.PARSE', [502, 103, 902, 992]]);
		self.INPUT.push(['ОШИБКА: МЕСТА НА ОДНОМ ИЗ СЕГМЕНТОВ СДАНЫ', [203, 603, 901, 921]]);
		self.INPUT.push(['ЗАКАЗ УЖЕ ОТМЕНЕН. ВОЗМОЖНОЙ ПРИЧИНОЙ ОТМЕНЫ МОГЛО БЫТЬ ИСТЕЧЕНИЕ ВРЕМЕНИ ОЖИДАНИЯ', [204, 901, 930]]);
		self.INPUT.push(['ЛИСТ ОЖИДАНИЯ НА РЕЙСЕ ЗАПРЕЩЕН', [303, 901, 923]]);
		self.INPUT.push(['UNABLE - CLASS DOES NOT EXIST FOR THIS FLIGHT', [301, 901]]);
		self.INPUT.push(['REQUEST BUILD: ', [505, 103, 903, 990]]);
		self.INPUT.push(['PARSE ERROR: ', [502, 103, 903, 990]]);
		self.INPUT.push(['LEGACY ERROR: ', [506, 103, 903, 990]]);
		self.INPUT.push(['ПРИ ПОИСКЕ ПЕРЕЛЕТОВ В ГДС \'SABRE\' ПРОИЗОШЛА ОШИБКА', [507, 509, 102, 901]]);
		self.INPUT.push(['ПРИ ПОИСКЕ ПЕРЕЛЕТОВ В ГДС \'SIRENA\' ПРОИЗОШЛА ОШИБКА', [507, 508, 102, 901]]);
        self.INPUT.push(['TRANSACTION ERROR: PROCEDURE/8214', [313, 932]]);
		self.INPUT.push(['COMMUNICATION ERROR: PROCESSING TIMEOUT', [501, 104, 902]]);
		self.INPUT.push(['NO COMPLETE JOURNEY CAN BE BUILT', [507, 102, 932]]);
		self.INPUT.push(['NO FLIGHT SCHEDULES FOR QUALIFIERS USED', [310, 932]]);
		self.INPUT.push(['NO AVAILABLE FLIGHT SCHEDULES', [313, 932]]);
		self.INPUT.push(['ERROR DURING PROCESSING', [501, 104, 902]]);
		self.INPUT.push(['XMLDOC HAS NO METHOD FIND', [502, 102, 902]]);
        self.INPUT.push(['EMPTY XMLDOC', [102, 902]]);
        self.INPUT.push(['SEGS CANX', [205, 107, 901, 929]]);
		self.INPUT.push(['NO COMBINABLE FARES FOR CLASS USED', [302, 901, 922]]);
        self.INPUT.push(['INVALID CLASS', [302, 901, 922]]);
        self.INPUT.push(['NEED AIRLINE PNR LOCATOR - VERIFY AND ENTER IN SEGMENT-0052', [510, 302, 901, 990]]);
        self.INPUT.push(['NO ALTERNATIVE FARES FOUND', [311, 901, 921]]);
        self.INPUT.push(['NO FARE FOR CLASS USED', [513, 509, 301, 901, 922]]);
        self.INPUT.push(['SPECIFIED HALTONSTATUS RECEIVED - PROCESSING ABORTED', [304, 901, 921]]);
        self.INPUT.push(['CODE - HX SEG STATUS NOT ALLOWED-0003', [513, 509, 206, 901, 929]]);
        self.INPUT.push(['010 - TIME', [304, 107, 901, 933]]);
		self.INPUT.push(['ВЫПИСКА УСЛУГ БЛОКИРОВАНА', [511, 801, 106, 901, 990]]);
		self.INPUT.push(['НЕКОРРЕКТНАЯ ТАРИФИКАЦИЯ. PNR АННУЛИРОВАН', [312, 901, 931, 990]]);
		self.INPUT.push(['ПРИ ПОИСКЕ ПЕРЕЛЕТОВ В ГДС АККАУНТЕ \'SABRE', [507, 509, 102, 901]]);
		self.INPUT.push(['ПРИ ПОИСКЕ ПЕРЕЛЕТОВ В ГДС АККАУНТЕ \'SIRENA', [507, 508, 102, 901]]);
		self.INPUT.push(['НЕПРАВИЛЬНЫЙ ФОРМАТ ЭЛЕМЕНТА \'DOC\'', [401, 107, 901, 940]]);
        self.INPUT.push(['CANNOT OBTAIN AUTHORIZATION', [108, 514, 901, 927, 992]]);
        self.INPUT.push(['ENDTRANSACTIONLLSRQ: UNABLE TO PROCESS DUPLICATE NAMES', [401, 107, 940, 941]]);
        self.INPUT.push(['ENDTRANSACTIONLLSRQ: VERIFY ORDER OF ITINERARY SEGMENTS', [402, 901, 990]]);
        self.INPUT.push(['.EMAIL ENTRY REQUIRES ONE @ CHARACTER', [401, 107, 940, 942]]);
        self.INPUT.push(['PNR NOT FOUND', [207, 901, 934]]);
        self.INPUT.push(['ENDTRANSACTIONLLSRQ: NUMBER OF NAMES NOT EQUAL TO RESERVATIONS', [509, 301, 901, 990]]);
        self.INPUT.push(['TICKET/TIMELIMIT MUST PRECEDE TRAVEL DATE', [509, 901, 933]]);
        self.INPUT.push(['INVALID PQ NUMBER', [301, 513, 901, 922]]);
        self.INPUT.push(['SPECIFIED FARE BASIS CODE(S) NOT APPLICABLE', [514, 302, 901, 922]]);
        self.INPUT.push(['FORMAT, CHECK SEGMENT NUMBER', [513, 509, 206, 901, 922]]);
        self.INPUT.push(['LESS THAN 4 HOURS BEFORE DEPARTURE', [514, 305, 208, 901, 935]]);
        self.INPUT.push(['ERROR: CONNECT ECONNRESET', [503, 101, 902]]);
        self.INPUT.push(['ECONNRESET', [503, 101, 902]]);
        self.INPUT.push(['ENDTRANSACTIONLLSRQ: DIRECT CONNECT IN PROGRESS', [302, 102, 901, 990]]);
        self.INPUT.push(['NO SEATS', [514, 304, 923]]);
        self.INPUT.push(['THIS PNR WAS ENTIRELY CANCELLED', [504, 204, 936]]);
        self.INPUT.push(['NO SEGMENTS TO DELETE', [504, 204, 936]]);
        self.INPUT.push(['PARSE ERROR: ERROR: EMPTY XMLDOCS', [503, 102, 902]]);
        self.INPUT.push(['NP DOCUMENT CANNOT BE ISSUED IN RU', [508, 401, 940]]);
        self.INPUT.push(['INVALID EXPIRE DATE ', [508, 401, 940, 945]]);
        self.INPUT.push(['FF MILEAGE AGREEMENT EXISTS', [514, 402, 209, 940, 944]]);
        self.INPUT.push(['ССР ЧПСЖ НЕ ПОДТВЕРЖДЕН ДЛЯ ПАССАЖИРА', [514, 402, 209, 940, 944]]);
        self.INPUT.push(['FREQUENT TRAVELER NUMBER DOES NOT EXIST FOR THIS AIRLINE', [514, 402, 209, 940, 944]]);
        self.INPUT.push(['NO VALID SEGMENTS FOUND', [509, 402, 107, 901, 921]]);
        self.INPUT.push(['INTERNAL SERVICE ERROR', [510, 904]]);
        self.INPUT.push(['SERVICE IS NOT AVAILABLE', [510, 904]]);
        self.INPUT.push(['CANNOT RESERVE SEATS ON FLIGHT', [510, 901, 921]]);
        self.INPUT.push(['NO BRANDS FOUND', [510, 901, 920]]);

      	self.inputCount = self.INPUT.length;
		
		// ошибки на выход
		self.OUTPUT = new Object();
		
		// отладочная информация

		// FOR USER
        // то что показывается пользователям

		// Общие ошибки
        self.OUTPUT.e901 = 'Ошибка системы бронирования';
        self.OUTPUT.e902 = 'Не удалось получить ответ от СБ';
        self.OUTPUT.e903 = 'Ошибка шлюза';
        self.OUTPUT.e904 = 'Внутренняя ошибка СБ. Попробуйте выполнить запрос позже.';

        // ошибки сб
        self.OUTPUT.e920 = 'Доступных рейсов не найдено';
        self.OUTPUT.e921 = 'Не удалось подтвердить места в авиакомпании';
        self.OUTPUT.e922 = 'Не удалось забронировать и оценить PNR. Возможно, тариф не рассчитан в системе';
        self.OUTPUT.e923 = 'Нет мест на рейсе, листы ожидания не поддерживаются';
        self.OUTPUT.e924 = 'PNR занято другим пользователем, освободите пульт';
        self.OUTPUT.e925 = 'Время операции истекло, возможен только возврат';
        self.OUTPUT.e926 = 'Произошло изменение суммы заказа';
        self.OUTPUT.e927 = 'Идентификатор выбранного перелёта некорректен или устарел.';
        self.OUTPUT.e928 = 'Отмена бронирования невозможна';
        self.OUTPUT.e929 = 'Сегмент отменен авиакомпанией.';
        self.OUTPUT.e930 = 'Заказ отменен. Возможной причиной отмены могло быть истечение времени ожидания';
        self.OUTPUT.e931 = 'Заказ отменен. Возможной причиной отмены могла быть некорректная тарификация';
        self.OUTPUT.e932 = 'Доступные рейсы не найдены';
        self.OUTPUT.e933 = 'Не удалось забронировать и оценить PNR. Возможно, некорректно рассчитан таймлимит';
        self.OUTPUT.e934 = 'Заказ не найден';
        self.OUTPUT.e935 = 'Не удалось забронировать и оценить PNR. Менее 4 часов до вылета';
        self.OUTPUT.e936 = 'Заказ отменен';

        // ошибки валидации
        self.OUTPUT.e940 = 'СБ не принимает введённые данные по документам. Проверьте корректность внесённых данных.';
        self.OUTPUT.e941 = 'Дублирование имен пассажиров.';
        self.OUTPUT.e942 = 'Некорректный email.';
        self.OUTPUT.e943 = 'Для выбранной перевозки имена пассажиров должны задаваться латиницей';
        self.OUTPUT.e944 = 'Ошибка при внесении бонусной карты.';
        self.OUTPUT.e945 = 'Некорректная дата истечения срока документа.';

        // Руководство к действию
        self.OUTPUT.e990 = 'Обратитесь в поддержку.';
        self.OUTPUT.e991 = 'Попробуйте осуществить перебронирование.';
        self.OUTPUT.e992 = 'Попробуйте повторить операцию.';

        // DEBUG
		self.OUTPUT.e101 = 'Не удалось получить ответ от ГСБ';
		self.OUTPUT.e102 = 'Не удалось получить ответ от СБ';
		self.OUTPUT.e103 = 'Ошибка WBENG';
		self.OUTPUT.e104 = 'Завершение процесса по таймауту';
		self.OUTPUT.e105 = 'Незавершённый маршрут не может быть построен';
		self.OUTPUT.e106 = 'Блокирование системы на выписку';
		self.OUTPUT.e107 = 'Ошибка бронирования';
        self.OUTPUT.e108 = 'Истекло время сессии. Пожалуйста, повторите поиск.';
		// то что показывается пользователям. ошибки, как руководство к действию
		// INFO
		self.OUTPUT.e201 = 'PNR занято другим пользователем, освободите пульт';
		self.OUTPUT.e202 = 'Произошло изменение суммы заказа, осуществите перерасчёт';
		self.OUTPUT.e203 = 'ОШИБКА: МЕСТА НА ОДНОМ ИЗ СЕГМЕНТОВ СДАНЫ';
		self.OUTPUT.e204 = 'Заказ уже отменен. Возможной причиной отмены могло быть истечение времени ожидания';
        self.OUTPUT.e205 = 'На сегменте нет мест. Осуществите перебронирование';
        self.OUTPUT.e206 = 'Сегмент отменен авиакомпанией. Осуществите перебронирование';
        self.OUTPUT.e207 = 'PNR не найден';
        self.OUTPUT.e208 = 'Менее 4 часов до вылета';
        self.OUTPUT.e209 = 'Ошибка при внесении бонусной карты';
		// NOTICE
		self.OUTPUT.e301 = 'Тариф не рассчитан в системе, бронирование невозможно';
		self.OUTPUT.e302 = 'Не удалось подтвердить места в авиакомпании';
		self.OUTPUT.e303 = 'Нет мест на рейсе, листы ожидания не поддерживаются';
		self.OUTPUT.e304 = 'Невозможно забронировать и оценить PNR';
		self.OUTPUT.e305 = 'Невозможно получить места на рейсе';
		self.OUTPUT.e306 = 'Время операции истекло, возможен только возврат';
		self.OUTPUT.e307 = 'Для выбранной перевозки имена пассажиров должны задаваться латиницей';
		self.OUTPUT.e308 = 'Идентификатор выбранного перелёта некорректен или устарел';
		self.OUTPUT.e309 = 'Перелёт не найден';
		self.OUTPUT.e310 = 'Не определено расписание для выбранных пунктов';
		self.OUTPUT.e311 = 'Нет комбинированных тарифов';
		self.OUTPUT.e312 = 'Некорректная тарификация. PNR аннулирован';
		self.OUTPUT.e313 = 'Нет доступных рейсов в расписании';
        self.OUTPUT.e314 = 'Некорректный таймлимит';
		// WARNING
		self.OUTPUT.e401 = 'СБ не принимает введённые данные по документам. Проверьте корректность внесённых данных.';
        self.OUTPUT.e402 = 'Ошибка СБ. Проверьте корректность внесённых данных.';
		// ERROR
		self.OUTPUT.e501 = 'Не удалось получить ответ от СБ';
		self.OUTPUT.e502 = 'Ошибка разбора ответа, СБ вернула нечитаемые данные';
		self.OUTPUT.e503 = 'СБ не отвечает';
		self.OUTPUT.e504 = 'Отмена бронирования невозможна';
		self.OUTPUT.e505 = 'Ошибка сервера';
		self.OUTPUT.e506 = 'Ошибка сборки ответа';
		self.OUTPUT.e507 = 'При поиске в СБ произошла ошибка';
		self.OUTPUT.e508 = 'Ошибка СБ "Сирена". Обратитесь в поддержку.';
		self.OUTPUT.e509 = 'Ошибка СБ "Sabre". Обратитесь в поддержку.';
		self.OUTPUT.e510 = 'Внутренняя ошибка СБ. Попробуйте выполнить запрос позже.';
		self.OUTPUT.e511 = 'Блокирование системы на выписку. Немедленно сообщите оператору.';
        self.OUTPUT.e512 = 'Вам не разрешена данная операция. Обратитесь в поддержку.';
        self.OUTPUT.e513 = 'Выписка невозможна. Обратитесь в поддержку.';
        self.OUTPUT.e514 = 'Ошибка СБ';
		// то что показывается операторам. ошибки о кризисе в работе системы
		// CRITICAL
		self.OUTPUT.e601 = 'PNR занято другим пользователем, освободите пульт';
		self.OUTPUT.e602 = 'Произошло изменение суммы заказа, осуществите перерасчёт';
		self.OUTPUT.e603 = 'ОШИБКА: МЕСТА НА ОДНОМ ИЗ СЕГМЕНТОВ СДАНЫ';
		self.OUTPUT.e604 = 'Отмена бронирования невозможна. Создана заявка';
		// ALERT
		// EMERGENCY
		self.OUTPUT.e801 = 'Блокирование системы на выписку';
	}
	scbsMessenger.prototype.getTypeError = function(code) {
		code = Math.floor(code / 100);
		var types = ['UNDEF', 'DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY', 'FORUSER'];
		if(!types[code]) { return 'UNDEF'; }
		return types[code];
	};
	scbsMessenger.prototype.getOutMessage = function(code, mes) {
		code = parseInt(code);
		var err = new Object();
		err.type = self.getTypeError(code);
		err.code = code;
		err.message = mes;
		return err;
	};
	scbsMessenger.prototype.selectMessage = function(num, mes) {
		if(!num) { return null; }
		if(!self.OUTPUT['e' + num] && !mes) { return null; }
		if(!mes) { mes = self.OUTPUT['e' + num]; }
		var err = self.getOutMessage(num, mes);
		/*if(errs[0].type == 'DEBUG' && errs[0].code != 100) {
			errs[1] = self.getOutMessage(100, mes);
		}*/
		return err;
	};
	scbsMessenger.prototype.filterMessages = function(inmes) {
		if(inmes == undefined) { inmes = []; }
		var j = 0, i = 0, k = 0, strPos = -1, inpLen = 0, textcontent = false, found = false, debugYet = false;
		var outmes = [], yetcode = {}, regexp, newerr, inIMes = '';
		
		//console.log(typeof(self.INPUT[j][0]));
		
		
		var incount = inmes.length;
		for(i = 0; i < incount; i++) {
			if(!inmes[i] || !inmes[i].message) { continue; }
			if(inmes[i].code) { outmes.push(inmes[i]); continue; }
			regexp = /[a-zа-яё]+/i;
			textcontent = regexp.test(inmes[i].message);
			if(!textcontent) { continue; }
			// входящее сообщение
			inIMes = inmes[i].message.toUpperCase();
			found = false;
			
			// некоторые сообщения должны быть обязательно сброшены в DEBUG, но более одного раза бессмысленно
			debugYet = false;
			
			if(inmes[i].source) {
				newerr = self.getOutMessage(100, 'WBENG fall, source: ' + inmes[i].source);
				outmes.push(newerr);
				// при сбрасывании сообщения в DEBUG обязательно передаём исходное сообщение
				newerr = self.getOutMessage(100, inmes[i].message);
				outmes.push(newerr);
				debugYet = true;
			}
			
			// крутим шаблоны входящих сообщений
			for(j = 0; j < self.inputCount; j++) {
				// ищем во входящем шаблон
				strPos = inIMes.search(self.INPUT[j][0]);
				if(strPos != -1) {
					inpLen = self.INPUT[j][1].length;
					found = true;
					// накидываем стандартные сообщения на выход
					for(k = 0; k < inpLen; k++) {
						newerr = self.selectMessage(self.INPUT[j][1][k]);

                      if(yetcode['p' + newerr.code]) { continue; }
						outmes.push(newerr);
						if(newerr.code % 100) {
							yetcode['p' + newerr.code] = true;
						}
						
						if(newerr.type == 'DEBUG' && newerr.code != 100 && !debugYet) {
							newerr = self.getOutMessage(100, inmes[i].message);
							outmes.push(newerr);
							debugYet = true;
						}
					}
					break;
				}
			}
			// если входящем сообщению не найден шаблон, запишем входящее без изменений на выход
			if(!found) {
				inmes[i].code = '000'; // чтобы в будущем не проверялось
				outmes.push(inmes[i]);
			}
		}
		
		return outmes;
	};
	return new scbsMessenger();
})();
module.exports = scbsMessenger;
