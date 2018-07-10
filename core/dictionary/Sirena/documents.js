/* нашел в каком то справочнике по сирене для кассиров.
здесь не только удостоверяющие, но и дополнительные типы.
думаю пригодится когда нибудь.
Инструкция кассира ГРС «Сирена-Трэвел» часть 1
	Варианты ввода информации о документе, удостоверяющем личность пассажира:
		ПС1234567890 – Общегражданский паспорт
		ПСП415184611 – Общегражданский заграничный паспорт
		ДП1234567890 – Дипломатический паспорт
		СП1234567890 – Служебный паспорт
		ПМ1234567890 – Паспорт моряка (удостоверение личности моряка)
		СР5ИК018648 – Свидетельство о рождении для лиц, не достигших 14–летнего возраста
		ВБ5078563 – Военный билет для солдат, матросов, сержантов и старшин
		УД6547 ГОСДУМА – Удостоверение депутата Совета Федерации или депутата Государственной
		Думы Федерального Собрания (между номером документа и наименованием
		организации, выдавшей документ, должен вводиться пробел)
		УДЛ018ЖС548 – Удостоверение личности военнослужащего РФ (для офицеров, прапорщиков
		и мичманов)
		СПО654896 – Справка об освобождении из мест лишения свободы
		ВУЛ24185 – Удостоверение, выдаваемое осужденному, получившему разрешение на
		длительный или краткосрочный выезд за пределы мест лишения свободы
		СПУ24185 – Временное удостоверение личности, выдаваемое гражданину РФ органами
		внутренних дел при утрате или замене паспорта
		НП1234567890 – Национальный паспорт
		ЗА12345678 – Заграничный паспорт гражданина любой страны, кроме России
		ВЖ123456 – Вид на жительство
 */

/**
 * codeRu, codeEn - код в сирене на русском и анг.
 * nameRu, nameEn - названия в сирене на рус и анг
 * isInternational - признак международности (для международных документов следует указать дату окончания срока действия)
 * needsCitizenship - необходимость указания гражданства
 * type - (type=0)удостоверение личности,  (type=1) документ на предоставление льготы .
 * ttbCode - код в ТТБукинге
 */
var documents = [
	{
		codeRu: 'ПС',
		codeEn: 'PS',
		nameRu: 'ПАСПОРТ',
		nameEn: 'PASSPORT',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: "INTERNAL"
	},
	{
		codeRu: 'ПСП',
		codeEn: 'PSP',
		nameRu: 'ЗАГРАНИЧНЫЙ ПАСПОРТ ГРАЖДАНИНА РФ',
		nameEn: 'INTERNATIONAL PASSPORT',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: "FOREIGN"
	},
	{
		codeRu: 'УД',
		codeEn: 'UD',
		nameRu: 'УДОСТОВЕРЕН ДЕПУТАТА СОВЕТА ФЕДЕРАЦИЙ ИЛИ ГОС ДУМЫ',
		nameEn: 'IDENTIFICATION OF A DEPUTY',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'УДЛ',
		codeEn: 'UDL',
		nameRu: 'УДОСТОВЕРЕНИЕ ЛИЧНОСТИ ОФИЦЕРА ПРАПОРЩИКА МИЧМАНА',
		nameEn: 'OFFICER IDENTIFICATION',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: "OFFICERID"
	},
	{
		codeRu: 'СПО',
		codeEn: 'SPO',
		nameRu: 'СПРАВКА ОБ ОСВОБОЖДЕНИИ ДЛЯ ОСВОБОДИВШИХСЯ ЛИЦ',
		nameEn: 'CERTIFICATE OF RELEASE',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'СПУ',
		codeEn: 'SPU',
		nameRu: 'ВРЕМЕННОЕ УДОСТ ЛИЧНОСТИ ПРИ УТРАТЕ ИЛИ ЗАМЕНЕ ПС',
		nameEn: 'DOCUMENT OF PASSPORT LOSING',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'СР',
		codeEn: 'SR',
		nameRu: 'СВИДЕТЕЛЬСТВО О РОЖДЕНИИ',
		nameEn: 'BIRTH REGISTRATION DOCUMENT',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: "BIRTHDAY_NOTIFICATION"
	},
	{
		codeRu: 'ВБ',
		codeEn: 'VB',
		nameRu: 'ВОЕННЫЙ БИЛЕТ ДЛЯ ПРОХОДЯЩ СЛУЖБУ ИЛИ ПО КОНТРАКТУ',
		nameEn: 'MILITARY IDENTIFICATION CARD',
		isInternational: false,
		needsCitizenship: true,
		type: 0,
		ttbCode: "MILITARYID"
	},
	{
		codeRu: 'БП',
		codeEn: 'BP',
		nameRu: 'ПАСПОРТ ПРИ РЕГИСТРАЦИИ',
		nameEn: 'PASSPORT ON REGISTRATION',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ВУЛ',
		codeEn: 'VUL',
		nameRu: 'ВРЕМЕННОЕ УДОСТОВЕРЕНИЕ ЛИЧНОСТИ',
		nameEn: 'TEMPORARY IDENTITY CARD',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ВЖ',
		codeEn: 'VV',
		nameRu: 'ВИД НА ЖИТЕЛЬСТВО',
		nameEn: 'RESIDENCE',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ПМ',
		codeEn: 'PM',
		nameRu: 'ПАСПОРТ МОРЯКА УДОСТОВЕРЕНИЕ ЛИЧНОСТИ МОРЯКА',
		nameEn: 'SEAMANS PASSPORT',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: "SEAMANSID"
	},
	{
		codeRu: 'СП',
		codeEn: 'SP',
		nameRu: 'СЛУЖЕБНЫЙ ПАСПОРТ',
		nameEn: 'SERVICE PASSPORT',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ДП',
		codeEn: 'DP',
		nameRu: 'ДИПЛОМАТИЧЕСКИЙ ПАСПОРТ',
		nameEn: 'DIPLOMATIC PASSPORT',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'НП',
		codeEn: 'NP',
		nameRu: 'НАЦИОНАЛЬНЫЙ ПАСПОРТ',
		nameEn: 'NATIONAL PASSPORT',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'СВВ',
		codeEn: 'CVV',
		nameRu: 'СВИДЕТЕЛЬСТВО НА ВОЗВРАЩЕНИЕ В СТРАНЫ СНГ',
		nameEn: 'CERTIFICATE FOR RETURN TO CIS COUNTRIES',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: "RETURNID"
	},
	{
		codeRu: 'ГД',
		codeEn: 'GD',
		nameRu: 'УДОСТ ДЕПУТАТА ГОС ДУМЫ ФЕДЕРАЛЬНОГО СОБРАНИЯ РФ',
		nameEn: 'CERTIFICATE OF DEPUTY OF STATE DUMA',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'КУ',
		codeEn: 'KU',
		nameRu: 'КОМАНДИРОВОЧНОЕ УДОСТОВЕРЕНИЕ',
		nameEn: 'КОМАНДИРОВОЧНОЕ УДОСТОВЕРЕНИЕ',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СТ',
		codeEn: 'ST',
		nameRu: 'СЛ ТРЕБ ДЛЯ РАБОТН ГА А ТАКЖЕ ДРУГОГО ПРЕДПРИЯТ',
		nameEn: 'SERVICE REQUIREMENT FOR THE CIVIL AVIATION',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ГБ',
		codeEn: 'GB',
		nameRu: 'ГОДОВОЙ СЛУЖ БИЛЕТ ДЛЯ РАБОТН ГА И ДР ПРЕДПРИЯТ',
		nameEn: 'ANNUAL SERVICE TICKET FOR THE CIVIL AVIATOPION',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СС',
		codeEn: 'SS',
		nameRu: 'СВИДЕТЕЛЬСТВО О СМЕРТИ',
		nameEn: 'DEATH CERTIFICATE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'НЛ',
		codeEn: 'NL',
		nameRu: 'НАПРАВЛЕНИЕ НА ЛЕЧЕНИЕ',
		nameEn: 'REFERRAL TO TREATMENT',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'МВ',
		codeEn: 'MV',
		nameRu: 'СПРАВКА МЕДИКО СОЦИАЛЬНОЙ ЭКСПЕРТИЗЫ',
		nameEn: 'HELP MEDICAL AND SOCIAL EXPERTISE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'МД',
		codeEn: 'MD',
		nameRu: 'МЕДИЦИНСКАЯ СПРАВКА',
		nameEn: 'MEDICAL CERTIFICATE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'УИ',
		codeEn: 'UI',
		nameRu: 'УДОСТОВЕРЕНИЕ ИНВАЛИДА',
		nameEn: 'INVALID LICENSE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СИ',
		codeEn: 'SI',
		nameRu: 'СПР О ПРАВЕ РЕБ ИНВ НА ЛГ ВЫДАН ОРГАНОМ СОЦ ЗАЩИТЫ',
		nameEn: 'CERTIFICATE OF DISABLE CHILD TO BENEFIT',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СУ',
		codeEn: 'SU',
		nameRu: 'СЛУЖЕБНОЕ УДОСТ ИЛИ ДР ДОКУМ УДОСТ ПРОФ ПРИНАДЛЕЖН',
		nameEn: 'BUSINESS CARD PROFESSIONAL AFFILIATION',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'РЗ',
		codeEn: 'RZ',
		nameRu: 'РАЗРЕШ РУКОВОД АП НА ПЕРЕВОЗ БЕСПЛАТ ИЛИ СО СКИДК',
		nameEn: 'SERVICE REQUIREMENT',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СЛ',
		codeEn: 'CL',
		nameRu: 'ДОК ПОДТВЕРЖД ЧЛЕНСТВО В КЛУБЕ АССОЦИАЦ ОРГАНИЗАЦ',
		nameEn: 'ДОК ПОДТВЕРЖД ЧЛЕНСТВО В КЛУБЕ АССОЦИАЦ ОРГАНИЗАЦ',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ПЗ',
		codeEn: 'PZ',
		nameRu: 'ДОК ПОДТВЕРЖДАЮЩИЙ ЗВАНИЕ И НАГРАДЫ ПАССАЖИРА',
		nameEn: 'DOCUMENT CERTIFYING RANK AND AWARDS PASSENGER',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'БР',
		codeEn: 'BR',
		nameRu: 'СВИДЕТЕЛЬСТВО О БРАКЕ',
		nameEn: 'MERRIAGE CERTIFICATE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СК',
		codeEn: 'SK',
		nameRu: 'СПРАВКА ИЗ ШКОЛЫ',
		nameEn: 'CERTIFICATE FROM THE SCHOOL',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'УБ',
		codeEn: 'UB',
		nameRu: 'УЧЕНИЧЕСКИЙ БИЛЕТ',
		nameEn: 'STUDENT ID',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СБ',
		codeEn: 'SB',
		nameRu: 'СТУДЕНЧЕСКИЙ БИЛЕТ',
		nameEn: 'STUDENT ID',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ПУ',
		codeEn: 'PU',
		nameRu: 'ПЕНСИОННОЕ УДОСТОВЕРЕНИЕ',
		nameEn: 'PENSIONER ID',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'УЛ',
		codeEn: 'UL',
		nameRu: 'УДОСТ ЛИЧНОСТИ ДЛЯ ВОЕННОСЛ ОФИЦЕР ПРАПОРЩ МИЧМААН',
		nameEn: 'УДОСТ ЛИЧНОСТИ ДЛЯ ВОЕННОСЛ ОФИЦЕР ПРАПОРЩ МИЧМААН',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'КС',
		codeEn: 'KS',
		nameRu: 'УДОСТ СУДЬИ КОНСТИТУЦИОННОГО СУДА',
		nameEn: 'CERTIFICATE OF A JUDGE OF THE CONTITUTION COURT',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ДМ',
		codeEn: 'DM',
		nameRu: 'УДОСТ ДЕПУТАТА МЕСТНЫХ ЗАКОНОДАТЕЛЬНЫХ ОРГАНОВ',
		nameEn: 'CERTIFICATE OF LOCAL LEGISLATURE DEPUTY',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'СФ',
		codeEn: 'SF',
		nameRu: 'УДОСТ ЧЛЕНА СОВЕТА ФЕДЕРАЦИИ ФЕДЕРАЛЬН СОБРАН РФ',
		nameEn: 'УДОСТ ЧЛЕНА СОВЕТА ФЕДЕРАЦИИ ФЕДЕРАЛЬН СОБРАН РФ',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ТС',
		codeEn: 'NS',
		nameRu: 'СВОБОДНЫЙ ТЕКСТ',
		nameEn: 'FREE TEXT',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'КН',
		codeEn: 'CN',
		nameRu: 'КОД НАГРАДЫ',
		nameEn: 'PRIZE CODE',
		isInternational: false,
		needsCitizenship: false,
		type: 1,
		ttbCode: ""
	},
	{
		codeRu: 'ЗА',
		codeEn: 'ZA',
		nameRu: 'ЗАГРАН ПАСПОРТ ГРАЖДАНИНА ЛЮБОЙ СТРАНЫ  КРОМЕ РФ',
		nameEn: 'INTERNATIONAL PASSPORT',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: "PASSPORT"
	},
	{
		codeRu: 'ЗБ',
		codeEn: 'ZB',
		nameRu: 'ЗАГРАН ПАСПОРТ ГРАЖДАНИНА РЕСПУБЛИКИ ТАДЖИКИСТАН',
		nameEn: 'FOREIGN PASSPORT OF THE REPUBLIC OF TADJIKISTAN',
		isInternational: true,
		needsCitizenship: true,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ЗС',
		codeEn: 'ZC',
		nameRu: 'ЗАГРАНИЧНЫЙ ПАСПОРТ',
		nameEn: 'INTERNATIONAL PASSPORT',
		isInternational: true,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'УП',
		codeEn: 'UP',
		nameRu: 'ПАСПОРТ ГРАЖДАНИНА УКРАИНЫ',
		nameEn: 'UKRAINIAN PASSPORT',
		isInternational: false,
		needsCitizenship: true,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'ПР',
		codeEn: 'PR',
		nameRu: 'ПАСПОРТ ФОРМЫ СССР',
		nameEn: 'USSR FORM PASSPORT',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	},
	{
		codeRu: 'БГ',
		codeEn: 'BG',
		nameRu: 'УДОСТОВЕРЕНИЕ ЛИЧНОСТИ ЛИЦА БЕЗ ГРАЖДАНСТВА',
		nameEn: 'ID OF PERSON WITH NO NATIONALITY',
		isInternational: false,
		needsCitizenship: false,
		type: 0,
		ttbCode: ""
	}
];

module.exports = documents;