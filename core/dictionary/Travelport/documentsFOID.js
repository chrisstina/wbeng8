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
        codeRu: 'PP',
        codeEn: 'PP',
        nameRu: 'ПАСПОРТ',
        nameEn: 'PASSPORT',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "INTERNAL"
    },
    {
        codeRu: 'PP',
        codeEn: 'PP',
        nameRu: 'ЗАГРАНИЧНЫЙ ПАСПОРТ ГРАЖДАНИНА РФ',
        nameEn: 'INTERNATIONAL PASSPORT',
        isInternational: true,
        needsCitizenship: false,
        type: 0,
        ttbCode: "FOREIGN"
    },
    {
        codeRu: 'PP',
        codeEn: 'PP',
        nameRu: 'ЗАГРАН ПАСПОРТ ГРАЖДАНИНА ЛЮБОЙ СТРАНЫ  КРОМЕ РФ',
        nameEn: 'INTERNATIONAL PASSPORT',
        isInternational: true,
        needsCitizenship: true,
        type: 0,
        ttbCode: "PASSPORT"
    },
    {
        codeRu: 'ID',
        codeEn: 'ID',
        nameRu: 'УДОСТОВЕРЕНИЕ ЛИЧНОСТИ ОФИЦЕРА ПРАПОРЩИКА МИЧМАНА',
        nameEn: 'OFFICER IDENTIFICATION',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "OFFICERID"
    },
    {
        codeRu: 'ID',
        codeEn: 'ID',
        nameRu: 'СВИДЕТЕЛЬСТВО О РОЖДЕНИИ',
        nameEn: 'BIRTH REGISTRATION DOCUMENT',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "BIRTHDAY_NOTIFICATION"
    },
    {
        codeRu: 'ID',
        codeEn: 'ID',
        nameRu: 'ВОЕННЫЙ БИЛЕТ ДЛЯ ПРОХОДЯЩ СЛУЖБУ ИЛИ ПО КОНТРАКТУ',
        nameEn: 'MILITARY IDENTIFICATION CARD',
        isInternational: false,
        needsCitizenship: true,
        type: 0,
        ttbCode: "MILITARYID"
    },
    {
        codeRu: 'PP',
        codeEn: 'PP',
        nameRu: 'ПАСПОРТ МОРЯКА УДОСТОВЕРЕНИЕ ЛИЧНОСТИ МОРЯКА',
        nameEn: 'SEAMANS PASSPORT',
        isInternational: true,
        needsCitizenship: true,
        type: 0,
        ttbCode: "SEAMANSID"
    }
];

module.exports = documents;