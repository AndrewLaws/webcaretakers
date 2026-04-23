// Client-side site search. Loads /assets/search-index.json on first focus,
// scores entries against the query, and renders a dropdown. Keyboard:
//   Down/Up  — move highlight
//   Enter    — open highlighted result (or first result if none highlighted)
//   Escape   — close dropdown and blur
(function () {
  'use strict';

  var INDEX_URL = '/assets/search-index.json';
  var MAX_RESULTS = 8;

  var input, results, form;
  var index = null;
  var loading = false;
  var highlighted = -1;

  function init() {
    form    = document.querySelector('[data-site-search]');
    input   = document.querySelector('[data-site-search-input]');
    results = document.querySelector('[data-site-search-results]');
    if (!form || !input || !results) return;

    input.addEventListener('focus', loadIndex);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);

    // Clicks outside close the dropdown.
    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) closeResults();
    });

    // Never submit (no server).
    form.addEventListener('submit', function (e) { e.preventDefault(); runSearch(); });
  }

  function loadIndex() {
    if (index || loading) return;
    loading = true;
    fetch(INDEX_URL)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) { index = data; loading = false; })
      .catch(function () { index = []; loading = false; });
  }

  function onInput() {
    highlighted = -1;
    runSearch();
  }

  function onKeyDown(e) {
    var items = results.querySelectorAll('li');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      highlighted = Math.min(highlighted + 1, items.length - 1);
      paintHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      highlighted = Math.max(highlighted - 1, 0);
      paintHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var target = items[highlighted >= 0 ? highlighted : 0];
      var link = target && target.querySelector('a');
      if (link) window.location.href = link.getAttribute('href');
    } else if (e.key === 'Escape') {
      closeResults();
      input.blur();
    }
  }

  function paintHighlight(items) {
    for (var i = 0; i < items.length; i++) {
      if (i === highlighted) items[i].classList.add('is-highlighted');
      else items[i].classList.remove('is-highlighted');
    }
  }

  function runSearch() {
    var q = input.value.trim().toLowerCase();
    if (!q) { closeResults(); return; }
    if (!index) {
      // Not loaded yet; try again shortly.
      loadIndex();
      setTimeout(runSearch, 120);
      return;
    }
    var matches = score(index, q).slice(0, MAX_RESULTS);
    render(matches, q);
  }

  // Score one entry against a lowercased query. Higher score is better.
  // Hard priority: exact name start > name substring > summary substring.
  function scoreEntry(entry, q) {
    var name = (entry.name || '').toLowerCase();
    var summary = (entry.summary || '').toLowerCase();
    var category = (entry.category || '').toLowerCase();
    var score = 0;
    if (name === q)                score += 200;
    else if (name.indexOf(q) === 0) score += 150;
    else if (name.indexOf(q) >= 0)  score += 100;
    if (summary.indexOf(q) >= 0)    score += 30;
    if (category.indexOf(q) >= 0)   score += 20;

    // Bonus for each query word matching in name (so "uk tax" hits "UK Salary Tax").
    var parts = q.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      var nameHits = 0;
      for (var i = 0; i < parts.length; i++) {
        if (name.indexOf(parts[i]) >= 0) nameHits++;
      }
      if (nameHits === parts.length) score += 80;
      else if (nameHits > 0) score += 10 * nameHits;
    }

    // Slight boost for tools over categories so the specific tool wins
    // when the name is a near-tie. Only apply when there's already a match,
    // otherwise every tool would score > 0 on any query.
    if (score > 0 && entry.type === 'tool') score += 5;
    return score;
  }

  function score(idx, q) {
    var out = [];
    for (var i = 0; i < idx.length; i++) {
      var s = scoreEntry(idx[i], q);
      if (s > 0) out.push({ entry: idx[i], score: s });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.map(function (x) { return x.entry; });
  }

  function render(matches, q) {
    results.innerHTML = '';
    if (!matches.length) {
      var li = document.createElement('li');
      li.className = 'site-search__empty';
      li.textContent = 'No matches for "' + q + '"';
      results.appendChild(li);
      openResults();
      return;
    }
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      var li2 = document.createElement('li');
      var a   = document.createElement('a');
      a.href  = m.url;
      var nameEl = document.createElement('strong');
      nameEl.textContent = m.name;
      var catEl  = document.createElement('span');
      catEl.className = 'site-search__cat';
      catEl.textContent = m.category;
      a.appendChild(nameEl);
      a.appendChild(catEl);
      if (m.summary) {
        var sum = document.createElement('span');
        sum.className = 'site-search__summary';
        sum.textContent = m.summary;
        a.appendChild(sum);
      }
      li2.appendChild(a);
      results.appendChild(li2);
    }
    openResults();
  }

  function openResults() {
    results.hidden = false;
    form.setAttribute('data-open', 'true');
  }
  function closeResults() {
    results.hidden = true;
    form.removeAttribute('data-open');
    highlighted = -1;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
