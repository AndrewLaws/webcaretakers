(function () {
  'use strict';

  var lib = window.FleschReadingEase;
  if (!lib) return;

  var CALC_NAME = 'Flesch Reading Ease Score Calculator';

  var inputEl = document.querySelector('[data-fre-input]');
  var resultPanel = document.querySelector('[data-fre-result]');
  var easeEl = document.querySelector('[data-fre-ease]');
  var gradeEl = document.querySelector('[data-fre-grade]');
  var bandEl = document.querySelector('[data-fre-band]');
  var wordsEl = document.querySelector('[data-fre-words]');
  var sentencesEl = document.querySelector('[data-fre-sentences]');
  var syllablesEl = document.querySelector('[data-fre-syllables]');
  var proveItBody = document.querySelector('[data-prove-it-body]');
  var proveIt = document.querySelector('[data-prove-it]');

  if (!inputEl) return;

  var firedInteraction = false;
  function pushInteraction(field) {
    window.dataLayer = window.dataLayer || [];
    if (!firedInteraction) {
      firedInteraction = true;
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: CALC_NAME,
        field: field || ''
      });
    }
  }
  function pushResult(payload) {
    window.dataLayer = window.dataLayer || [];
    var data = { event: 'calculator_result', calculator_name: CALC_NAME };
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
    window.dataLayer.push(data);
  }

  function fmtScore(n) {
    if (!isFinite(n)) return '0';
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function clearResult() {
    if (resultPanel) resultPanel.hidden = true;
    if (easeEl) easeEl.textContent = '';
    if (gradeEl) gradeEl.textContent = '';
    if (bandEl) bandEl.textContent = '';
    if (wordsEl) wordsEl.textContent = '0';
    if (sentencesEl) sentencesEl.textContent = '0';
    if (syllablesEl) syllablesEl.textContent = '0';
    if (proveItBody) {
      proveItBody.innerHTML = '<p>Type or paste text above to see the working out.</p>';
    }
  }

  function renderProveIt(r) {
    if (!proveItBody) return;
    var html = '';
    html += '<p>Counts taken from the text:</p>';
    html += '<ul>';
    html += '<li>Words: <strong>' + r.words + '</strong></li>';
    html += '<li>Sentences: <strong>' + r.sentences + '</strong></li>';
    html += '<li>Syllables: <strong>' + r.syllables + '</strong></li>';
    html += '</ul>';
    if (r.words === 0 || r.sentences === 0) {
      html += '<p>Both formulae need at least one word and one sentence to produce a score.</p>';
      proveItBody.innerHTML = html;
      return;
    }
    var wps = r.words / r.sentences;
    var spw = r.syllables / r.words;
    html += '<p><strong>Reading Ease</strong> = 206.835 &minus; 1.015 &times; (words / sentences) &minus; 84.6 &times; (syllables / words)</p>';
    html += '<p>= 206.835 &minus; 1.015 &times; ' + fmtScore(wps) + ' &minus; 84.6 &times; ' + fmtScore(spw) + ' = <strong>' + fmtScore(r.readingEase) + '</strong></p>';
    html += '<p><strong>Grade Level</strong> = 0.39 &times; (words / sentences) + 11.8 &times; (syllables / words) &minus; 15.59</p>';
    html += '<p>= 0.39 &times; ' + fmtScore(wps) + ' + 11.8 &times; ' + fmtScore(spw) + ' &minus; 15.59 = <strong>' + fmtScore(r.gradeLevel) + '</strong></p>';
    html += '<p class="prove-it__note">Syllable counting uses a vowel-group heuristic with a silent-e rule. It is approximate, so expect a small drift on unusual or technical words.</p>';
    proveItBody.innerHTML = html;
  }

  function update() {
    var text = inputEl.value || '';
    var r = lib.analyse(text);

    if (wordsEl) wordsEl.textContent = String(r.words);
    if (sentencesEl) sentencesEl.textContent = String(r.sentences);
    if (syllablesEl) syllablesEl.textContent = String(r.syllables);

    if (r.words === 0 || r.sentences === 0) {
      if (resultPanel) resultPanel.hidden = false;
      if (easeEl) easeEl.textContent = '0.0';
      if (gradeEl) gradeEl.textContent = '0.0';
      if (bandEl) bandEl.textContent = 'Add some text to see the score.';
      renderProveIt(r);
      return;
    }

    var b = lib.band(r.readingEase);
    if (resultPanel) resultPanel.hidden = false;
    if (easeEl) easeEl.textContent = fmtScore(r.readingEase);
    if (gradeEl) gradeEl.textContent = fmtScore(r.gradeLevel);
    if (bandEl) bandEl.textContent = b.label;

    renderProveIt(r);

    pushResult({
      words: r.words,
      sentences: r.sentences,
      syllables: r.syllables,
      reading_ease: Math.round(r.readingEase * 10) / 10,
      grade_level: Math.round(r.gradeLevel * 10) / 10,
      band: b.label
    });
  }

  // Debounce live updates so analytics and DOM work do not run on every keystroke.
  var debounceTimer = null;
  function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 150);
  }

  inputEl.addEventListener('input', function () {
    pushInteraction('text');
    scheduleUpdate();
  });

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  // Initial state.
  clearResult();
  if (inputEl.value && inputEl.value.trim() !== '') update();
})();
