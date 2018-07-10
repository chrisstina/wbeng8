/*
A - Удостоверение инстранца
С - удостоверение постоянного резидента
P - Паспорт
T - миграционная карта и виза на повторный въезд
M - военный билет
N - документ, подтверждающий гражданство
V - свидетельство о пересечении границы

1. Военный билет - М

2. Паспорт моряка - P

3. Удостоверение личности офицера - M
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
        codeRu: 'P',
        codeEn: 'P',
        nameRu: 'ПАСПОРТ',
        nameEn: 'PASSPORT',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "INTERNAL"
    },
    {
        codeRu: 'P',
        codeEn: 'P',
        nameRu: 'ЗАГРАНИЧНЫЙ ПАСПОРТ ГРАЖДАНИНА РФ',
        nameEn: 'INTERNATIONAL PASSPORT',
        isInternational: true,
        needsCitizenship: false,
        type: 0,
        ttbCode: "FOREIGN"
    },
    {
        codeRu: 'P',
        codeEn: 'P',
        nameRu: 'ЗАГРАН ПАСПОРТ ГРАЖДАНИНА ЛЮБОЙ СТРАНЫ  КРОМЕ РФ',
        nameEn: 'INTERNATIONAL PASSPORT',
        isInternational: true,
        needsCitizenship: true,
        type: 0,
        ttbCode: "PASSPORT"
    },
    {
        codeRu: 'M',
        codeEn: 'M',
        nameRu: 'УДОСТОВЕРЕНИЕ ЛИЧНОСТИ ОФИЦЕРА ПРАПОРЩИКА МИЧМАНА',
        nameEn: 'OFFICER IDENTIFICATION',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "OFFICERID"
    },
    {
        codeRu: 'P',
        codeEn: 'P',
        nameRu: 'СВИДЕТЕЛЬСТВО О РОЖДЕНИИ',
        nameEn: 'BIRTH REGISTRATION DOCUMENT',
        isInternational: false,
        needsCitizenship: false,
        type: 0,
        ttbCode: "BIRTHDAY_NOTIFICATION"
    },
    {
        codeRu: 'M',
        codeEn: 'M',
        nameRu: 'ВОЕННЫЙ БИЛЕТ ДЛЯ ПРОХОДЯЩ СЛУЖБУ ИЛИ ПО КОНТРАКТУ',
        nameEn: 'MILITARY IDENTIFICATION CARD',
        isInternational: false,
        needsCitizenship: true,
        type: 0,
        ttbCode: "MILITARYID"
    },
    {
        codeRu: 'P',
        codeEn: 'P',
        nameRu: 'ПАСПОРТ МОРЯКА УДОСТОВЕРЕНИЕ ЛИЧНОСТИ МОРЯКА',
        nameEn: 'SEAMANS PASSPORT',
        isInternational: true,
        needsCitizenship: true,
        type: 0,
        ttbCode: "SEAMANSID"
    }
];

module.exports = documents;