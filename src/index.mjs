import Dictionary from "./dictionary.mjs";

function Predictionary() {
    let thiz = this;
    let _dicts = {};
    let _useDictionaries = null;

    thiz.loadDictionary = function (dictionaryKey, dictionaryJSON) {
        if (!dictionaryKey || !dictionaryJSON) {
            throw 'dictionaryKey and dictionaryJSON must be specified.';
        }
        let dictionary = new Dictionary();
        dictionary.load(dictionaryJSON);
        _dicts[dictionaryKey] = dictionary;
    };

    thiz.loadDictionaries = function (dictionariesJSON) {
        if (!dictionariesJSON) {
            throw 'dictionariesJSON must be specified.';
        }
        _dicts = {};
        let list = JSON.parse(dictionariesJSON);
        list.forEach(element => {
            thiz.loadDictionary(element.key, element.json);
        })
    };

    thiz.dictionaryToJSON = function (dictionaryKey) {
        let dict = _dicts[dictionaryKey];
        return dict ? dict.toJSON() : null;
    };

    thiz.dictionariesToJSON = function () {
        let list = [];
        Object.keys(_dicts).forEach(key => {
            list.push({
                key: key,
                json: _dicts[key].toJSON()
            })
        });
        return JSON.stringify(list);
    };

    thiz.useDictionary = function (dictionaryKey) {
        if (!dictionaryKey) {
            throw 'dictionaryKey must be specified.';
        }
        _useDictionaries = [dictionaryKey];
    };

    thiz.useDictionaries = function (dictionaryKeys) {
        if (!(dictionaryKeys instanceof Array)) {
            throw 'dictionaryKeys must be specified and of type Array.';
        }
        _useDictionaries = JSON.parse(JSON.stringify(dictionaryKeys));
    };

    thiz.useAllDictionaries = function () {
        _useDictionaries = null;
    };

    thiz.addDictionary = function (dictionaryKey, words) {
        if (!dictionaryKey) {
            throw 'dictionaryKey must be specified.';
        }
        _dicts[dictionaryKey] = new Dictionary();
        if (words && words instanceof Array) {
            words.forEach(element => {
                thiz.addWord(dictionaryKey, element);
            });
        }
    };

    thiz.addWord = function (dictionaryKey, element) {
        if (!_dicts[dictionaryKey] || !element) {
            throw 'dictionary not existing or word to add not specified.';
        }
        let dict = _dicts[dictionaryKey];
        if (typeof element === 'string') {
            dict.addWord(element);
        } else if (element.word && typeof element.word === 'string') {
            dict.addWord(element.word, element.frequency);
        }
    };

    thiz.predict = function (input, options) {
        let predictions = [];
        options = options || {};
        Object.keys(_dicts).forEach(key => {
            let dict = _dicts[key];
            predictions = predictions.concat(dict.predict(input, options));
        });
        predictions.sort((a, b) => {
            if (a.score === b.score) {
                return 0;
            }
            return (a.score < b.score) ? 1 : -1
        });
        let returnArray = predictions;
        if (options.maxPredicitons) {
            returnArray = predictions.slice(0, options.maxPredicitons);
        }
        return returnArray.map(prediction => prediction.word);
    };

    thiz.refineDictionaries = function (chosenWord, previousWord, addToDictionaryKey) {
        Object.keys(_dicts).forEach(key => {
            let dict = _dicts[key];
            dict.refine(chosenWord, previousWord, addToDictionaryKey === key);
        });
    };

    function getDictionariesToUse() {
        return Object.keys(_dicts).map(key => {
                return (_useDictionaries === null || _useDictionaries.includes(key)) ? _dicts[key] : null;
            }
        ).filter(dict => !!dict);
    }
}

export default Predictionary;