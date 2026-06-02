/**
 * AuthPack — Blog listing search & filter.
 *
 * Works purely on the static post cards already present in the HTML, so the
 * content stays fully crawlable for search engines and AI crawlers. JS only
 * shows/hides cards based on the search query and the active category chip.
 */
(function () {
    'use strict';

    var input = document.getElementById('blog-search-input');
    var filters = document.getElementById('blog-filters');
    var grid = document.getElementById('post-grid');
    var empty = document.getElementById('blog-empty');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.post-card'));
    var activeFilter = 'all';

    // Combining diacritical marks range (U+0300–U+036F), built without literal
    // invisible characters in source.
    var DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

    function normalize(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(DIACRITICS, ''); // strip accents for forgiving search
    }

    function apply() {
        var q = normalize(input ? input.value.trim() : '');
        var visible = 0;

        cards.forEach(function (card) {
            var haystack = normalize(
                (card.getAttribute('data-title') || '') + ' ' +
                (card.getAttribute('data-tags') || '')
            );
            var matchesQuery = q === '' || haystack.indexOf(q) !== -1;
            var category = card.getAttribute('data-category') || '';
            var matchesFilter = activeFilter === 'all' || category.indexOf(activeFilter) !== -1;

            var show = matchesQuery && matchesFilter;
            card.hidden = !show;
            if (show) visible++;
        });

        if (empty) empty.hidden = visible !== 0;
    }

    if (input) {
        input.addEventListener('input', apply);
    }

    if (filters) {
        filters.addEventListener('click', function (e) {
            var chip = e.target.closest('.filter-chip');
            if (!chip) return;
            activeFilter = chip.getAttribute('data-filter') || 'all';
            filters.querySelectorAll('.filter-chip').forEach(function (c) {
                c.classList.toggle('active', c === chip);
            });
            apply();
        });
    }
})();
