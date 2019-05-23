import Dictionary from "./dictionary.mjs";

function Predictionary() {
    let DEFAULT_DICTIONARY_KEY = 'DEFAULT_DICTIONARY_KEY';
    let PREDICT_METHOD_COMPLETE_WORD = 'PREDICT_METHOD_COMPLETE_WORD';
    let PREDICT_METHOD_NEXT_WORD = 'PREDICT_METHOD_NEXT_WORD';

    let thiz = this;
    let _dicts = {};

    thiz.loadDictionary = function (dictionaryJSON, dictionaryKey) {
        if (!dictionaryJSON) {
            throw 'dictionaryJSON must be specified.';
        }
        dictionaryKey = dictionaryKey || DEFAULT_DICTIONARY_KEY;
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
            thiz.loadDictionary(element.json, element.key);
        })
    };

    thiz.dictionaryToJSON = function (dictionaryKey) {
        dictionaryKey = dictionaryKey || DEFAULT_DICTIONARY_KEY;
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
        Object.keys(_dicts).forEach(key => {
            _dicts[key].disabled = dictionaryKey !== key;
        });
    };

    thiz.useDictionaries = function (dictionaryKeys) {
        if (!(dictionaryKeys instanceof Array)) {
            throw 'dictionaryKeys must be specified and of type Array.';
        }
        Object.keys(_dicts).forEach(key => {
            _dicts[key].disabled = !dictionaryKeys.includes(key);
        });
    };

    thiz.useAllDictionaries = function () {
        Object.keys(_dicts).forEach(key => {
            _dicts[key].disabled = false;
        });
    };

    thiz.addDictionary = function (dictionaryKey, words) {
        if (!dictionaryKey && _dicts[DEFAULT_DICTIONARY_KEY]) {
            throw 'dictionaryKey must be specified.';
        }
        dictionaryKey = dictionaryKey || DEFAULT_DICTIONARY_KEY;
        if (_dicts[dictionaryKey]) {
            throw 'dictionary already existing.';
        }
        _dicts[dictionaryKey] = new Dictionary();
        if (words && words instanceof Array) {
            words.forEach(element => {
                thiz.addWord(element, dictionaryKey);
            });
        }
    };

    thiz.addWord = function (element, dictionaryKey) {
        dictionaryKey = dictionaryKey || DEFAULT_DICTIONARY_KEY;
        if (!element) {
            throw 'element to add not specified.';
        }
        if (!_dicts[dictionaryKey]) {
            thiz.addDictionary(dictionaryKey);
        }
        let dict = _dicts[dictionaryKey];
        if (typeof element === 'string') {
            dict.addWord(element.trim());
        } else if (element.word && typeof element.word === 'string') {
            dict.addWord(element.word.trim(), element.rank);
        }
    };

    thiz.addWords = function (elements, dictionaryKey) {
        if (!(elements instanceof Array)) {
            throw 'elements to add must be instance of array specified.';
        }
        elements.forEach(element => {
            thiz.addWord(element, dictionaryKey);
        })
    };

    thiz.predict = function (input, options) {
        return predictInternal(input, options);
    };

    thiz.predictCompleteWord = function (input, options) {
        return predictInternal(input, options, PREDICT_METHOD_COMPLETE_WORD);
    };

    thiz.predictNextWord = function (input, options) {
        return predictInternal(input, options, PREDICT_METHOD_NEXT_WORD);
    };

    thiz.applyPrediction = function (input, chosenPrediction, options) {
        options = options || {};
        let addToDictionary = options.addToDictionary;
        let shouldCompleteLastWord = options.shouldCompleteLastWord !== undefined ? options.shouldCompleteLastWord : !isLastWordCompleted(input);
        let dontRefine = options.dontRefine;
        let lastWord = getLastWord(input);
        let temp = shouldCompleteLastWord ? input.substring(0, input.lastIndexOf(lastWord)) : input;
        if (temp.length > 0 && !isLastWordCompleted(temp)) {
            temp += ' ';
        }
        if (!dontRefine) {
            thiz.refineDictionaries(chosenPrediction, !shouldCompleteLastWord ? lastWord : null, addToDictionary);
        }
        return temp + chosenPrediction + ' ';
    };

    thiz.refineDictionaries = function (chosenWord, previousWord, addToDictionary) {
        addToDictionary = addToDictionary === true ? DEFAULT_DICTIONARY_KEY : addToDictionary;
        Object.keys(_dicts).forEach(key => {
            let dict = _dicts[key];
            if (!dict.disabled) {
                dict.refine(chosenWord, previousWord, addToDictionary === key);
            }
        });
    };

    function predictInternal(input, options, predictType) {
        let predictions = [];
        options = options || {};
        Object.keys(_dicts).forEach(key => {
            let dict = _dicts[key];
            if (!dict.disabled) {
                let predictFn = predictType === PREDICT_METHOD_NEXT_WORD ? dict.predictNextWord : (predictType === PREDICT_METHOD_COMPLETE_WORD ? dict.predictCompleteWord : null);
                predictFn = predictFn || (isLastWordCompleted(input) ? dict.predictNextWord : dict.predictCompleteWord);
                predictions = predictions.concat(predictFn(getLastWord(input), options));
            }
        });
        predictions.sort((a, b) => {
            if (a.frequency === b.frequency && a.rank === b.rank) {
                return 0;
            }
            if (a.frequency === b.frequency && (a.rank || b.rank)) {
                if (!a.rank) return 1;
                if (!b.rank) return -1;
                return (a.rank < b.rank) ? -1 : 1
            }
            return (a.frequency < b.frequency) ? 1 : -1
        });
        let returnArray = predictions;
        if (options.maxPredicitons) {
            returnArray = predictions.slice(0, options.maxPredicitons);
        }
        return returnArray.map(prediction => prediction.word);
    }
}

function getLastWord(text) {
    text = text.trim();
    let lastIndex = text.lastIndexOf(' ');
    let lastWord = '';
    if (lastIndex === -1) {
        lastWord = text;
    } else {
        lastWord = text.substring(lastIndex);
    }
    return lastWord.trim();
}

function isLastWordCompleted(text) {
    return text[text.length - 1] === ' ';
}

export default Predictionary;

export function instance() {
    return new Predictionary();
}