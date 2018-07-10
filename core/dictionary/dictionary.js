var DocumentDictionary = function (docs) {

	var self;
	var documents;

	/**
	 * @param docs
	 * @constructor
	 */
	function DocumentDictionary(docs) {
		self = this;
		documents = docs;
	}

	////////PRIVATE METHODS
	/**
	 * @param code - search code
	 * @param codeType default 'codeRu'
	 * @returns {*}
	 */
	function searchDocumentByCode(code, codeType) {
		if (code) {
			codeType = codeType || ['codeRu','codeEn'];
			var documentIndex = documents.findIndex(function (value) {
				if (codeType instanceof Array){
					for (var codeIndex in codeType){
						if (value[codeType[codeIndex]] === code){
							return true;
						}
					}
					return false;
				}else {
					return (value[codeType] === code);
				}
			});
			if (documentIndex + 1) {
				return documents[documentIndex];
			}
		}
		return false;
	}

	///////PUBLIC METHODS

	DocumentDictionary.prototype.getDocumentByCodeTTB = function(search){
		return searchDocumentByCode(search, 'ttbCode');
	};

	DocumentDictionary.prototype.getDocumentByCode = function (search) {
		return searchDocumentByCode(search);
	};


	return new DocumentDictionary(docs);
};

module.exports = DocumentDictionary;