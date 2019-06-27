/**
 * A simple search for modern one pagers, only in browser. No costly requests to servers necessary.
 * @licence MIT
 * @author David Urbansky (https://davidurbansky.com/)
 * @see https://github.com/ddsky/javascript-search
 */
var JsSearch = function JsSearch() {
    var titleIndex = {};
    var contentIndex = {};
    var documents = {};
    var selectedIndex = 0;
    var selectedDocument = undefined;

    function showSearchLayer() {
        document.getElementById('jss-search').style.display = 'block';
        document.getElementById('jss-search-layer').style.display = 'block';
        document.getElementById('jss-search-box').focus();

    }

    function hideSearchLayer() {
        document.getElementById('jss-search').style.display = 'none';
        document.getElementById('jss-search-layer').style.display = 'none';
    }

    function showResults(docIds) {
        document.getElementById('jss-search-results').style.display = 'none';
        document.getElementById('jss-search-results').innerHTML = '';
        if (!docIds) {
            return;
        }
        document.getElementById('jss-search-results').style.display = 'block';
        docIds.forEach(function (docId) {
            var doc = documents[docId];
            var docNode = document.createElement('div');
            docNode.className = 'jss-search-result';
            docNode.innerHTML = '<span class="title">' + doc.title + '</span>';
            if (doc.group) {
                docNode.innerHTML += '<span class="group"> — ' + doc.group + '</span>';
            }
            if (doc.meta) {
                docNode.innerHTML += '<p class="meta">' + doc.meta + '</p>';
            }
            docNode.onclick = function () {
                eval(doc.event)
            };

            document.getElementById('jss-search-results').appendChild(docNode);
        });

        // select the right one
        var searchResults = document.getElementsByClassName('jss-search-result');
        selectedIndex = selectedIndex % searchResults.length;
        if (selectedIndex < 0) {
            selectedIndex = searchResults.length - 1;
        }

        // remember the selected document (so that when enter is pressed we know what function to execute)
        var list = Array.from(docIds);
        selectedDocument = documents[list[selectedIndex]];

        for (var i = 0; i < searchResults.length; i++) {
            searchResults[i].className = 'jss-search-result';
        }
        var selectedDomElement = document.getElementsByClassName('jss-search-result').item(selectedIndex);
        selectedDomElement.className = 'jss-search-result active';
        selectedDomElement.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    }

    function intersection(setA, setB) {
        var _intersection = new Set();
        setB.forEach(function (elem) {
            if (setA.has(elem)) {
                _intersection.add(elem);
            }
        });
        return _intersection;
    }

    /**
     * Calculate left-edge n-grams from the string's words between n1 and n2 characters.
     * @param string The input string.
     * @param n1 The minimum n-gram length.
     * @param n2 The maximum n-gram length.
     * @returns {Set} Set of n-grams.
     */
    function calculateAllEdgeCharNgrams(string, n1, n2) {
        var nGrams = new Set();
        var parts = string.split(' ');
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            for (var n = n1; n <= n2; n++) {
                calculateCharEdgeNGrams(p, n, true).forEach(function (value) {
                    nGrams.add(value);
                });
            }
        }

        return nGrams;
    }

    /**
     * Calculate left-edge n-grams from the string with n characters.
     * @param string The input string.
     * @param n The n-gram length.
     * @param mustHitLeftEdge Whether the n-gram must hit the left edge.
     * @returns {Set} Set of n-grams.
     */
    function calculateCharEdgeNGrams(string, n, mustHitLeftEdge) {
        var nGrams = new Set();

        var length = string.length;
        if (length < n) {
            return nGrams;
        }

        for (var i = 0; i <= length - n; i++) {
            var nGram = '';
            for (var j = i; j < i + n; j++) {
                nGram += string.charAt(j);
            }
            nGrams.add(nGram);

            if (i === 0 && mustHitLeftEdge) {
                break;
            }
        }

        return nGrams;
    }

    function deepExtend(out) {
        out = out || {};

        for (var i = 1; i < arguments.length; i++) {
            var obj = arguments[i];

            if (!obj) {
                continue;
            }

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'object') {
                        out[key] = deepExtend(out[key], obj[key]);
                    } else if (!out[key]) {
                        out[key] = obj[key];
                    }
                }
            }
        }

        return out;
    }

    // return an object, through closure all methods keep bound to returned object
    return {
        init: function (triggerSearchBoxId, options) {

            // get default options
            if (!options) {
                options = {};
            }
            deepExtend(options, {
                placeholder: 'Quick Search',
            });

            // create necessary HTML
            var backgroundLayer = document.createElement('div');
            backgroundLayer.id = 'jss-search-layer';
            document.body.appendChild(backgroundLayer);
            var searchLayer = document.createElement('div');
            searchLayer.id = 'jss-search';
            searchLayer.innerHTML = '<input id="jss-search-box" type="text" placeholder="' + options.placeholder + '" /><div id="jss-search-results"></div>';
            document.body.appendChild(searchLayer);

            var self = this;
            document.getElementById('jss-search-layer').onclick = hideSearchLayer;
            document.getElementById(triggerSearchBoxId).onfocus = showSearchLayer;
            document.getElementById('jss-search-box').onkeyup = function (event) {
                if (event.keyCode === 27) {
                    hideSearchLayer();
                    return;
                } else if (event.keyCode === 38) {
                    selectedIndex--;
                    event.preventDefault();
                } else if (event.keyCode === 40) {
                    selectedIndex++;
                    event.preventDefault();
                } else if (event.keyCode === 13 && selectedDocument) {
                    eval(selectedDocument.event);
                    event.preventDefault();
                }
                self.search(this.value);
            };

            this.indexDocuments();
        },
        indexDocuments: function () {
            var docs = document.getElementsByClassName('jss-doc');
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                var title = doc.getAttribute('jss-title');
                var group = doc.getAttribute('jss-group');
                var meta = doc.getAttribute('jss-meta');
                var content = doc.getAttribute('jss-content');
                if (!content) {
                    content = doc.textContent;
                }
                var id = doc.getAttribute('jss-id');
                if (!id) {
                    id = 'jss-id-' + i;
                }
                var jssEvent = doc.getAttribute('jss-event');
                var documentObject = {
                    id: id,
                    title: title,
                    group: group,
                    meta: meta,
                    content: content,
                    event: jssEvent
                };

                // title and group will be edge-ngrammized
                var words = (title + ' ' + group + ' ' + meta).split(' ');
                for (var j = 0; j < words.length; j++) {
                    var word = words[j].toLowerCase();

                    var ngrams = calculateAllEdgeCharNgrams(word, 1, 12);

                    ngrams.forEach(function (ngram) {
                        var docIds = titleIndex[ngram];
                        if (!docIds) {
                            docIds = new Set();
                            titleIndex[ngram] = docIds;
                        }
                        docIds.add(id);
                    });
                }

                // content will only added by words
                words = content.split(' ');
                for (j = 0; j < words.length; j++) {
                    word = words[j].toLowerCase();

                    var docIds = contentIndex[word];
                    if (!docIds) {
                        docIds = new Set();
                        contentIndex[word] = docIds;
                    }
                    docIds.add(id);
                }

                documents[id] = documentObject;
            }

            // console.log(index);
        },
        search: function (query) {
            var tsStart = new Date().getTime();
            var parts = query.toLowerCase().split(' ');
            var idsFound = undefined;

            // search title index first
            for (var i = 0; i < parts.length; i++) {
                var tempIds = titleIndex[parts[i]];

                if (idsFound === undefined) {
                    idsFound = tempIds;
                } else if (tempIds !== undefined) {
                    idsFound = intersection(idsFound, tempIds);
                }
            }

            // if nothing found in titles, search in content
            if (idsFound === undefined || idsFound.length === 0) {
                for (var i = 0; i < parts.length; i++) {
                    var tempIds = contentIndex[parts[i]];
    
                    if (idsFound === undefined) {
                        idsFound = tempIds;
                    } else if (tempIds !== undefined) {
                        idsFound = intersection(idsFound, tempIds);
                    }
                }
            }

            showResults(idsFound);
            // console.log('searched in ' + (new Date().getTime() - tsStart) + 'ms');
        },
        enableShortcuts: function () {
            window.onkeydown = function (event) {
                if (event.ctrlKey && event.keyCode === 70) {
                    event.preventDefault();
                    showSearchLayer();
                }
            };
        },
        close: function() {
           hideSearchLayer();
        }
    }
}();
