(function () {
  'use strict';

  var lib = window.DicewareGen;
  if (!lib) return;

  var CALC_NAME = 'Diceware Passphrase Generator';

  var phraseEl     = document.querySelector('[data-passphrase]');
  var generateBtn  = document.querySelector('[data-generate]');
  var copyBtn      = document.querySelector('[data-copy]');
  var wordCountEl  = document.querySelector('[data-word-count]');
  var wordCountVal = document.querySelector('[data-word-count-value]');
  var sepEl        = document.querySelector('[data-separator]');
  var capEls       = document.querySelectorAll('[data-cap]');
  var statWords    = document.querySelector('[data-stat-words]');
  var statEntropy  = document.querySelector('[data-stat-entropy]');
  var statResist   = document.querySelector('[data-stat-resistance]');
  var proveItBody  = document.querySelector('[data-prove-it-body]');
  var proveIt      = document.querySelector('[data-prove-it]');

  if (!phraseEl || !generateBtn) return;

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
    if (payload) {
      for (var k in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
      }
    }
    window.dataLayer.push(data);
  }

  function getCap() {
    for (var i = 0; i < capEls.length; i++) {
      if (capEls[i].checked) return capEls[i].value;
    }
    return 'none';
  }

  function fmtBits(bits) {
    return (Math.round(bits * 10) / 10).toFixed(1) + ' bits';
  }

  function renderProveIt(result) {
    var html = '';
    html += '<p><strong>Working.</strong> ' + result.words.length + ' words drawn at random from a list of ' + result.wordlistSize.toLocaleString('en-GB') + '.</p>';
    html += '<ul class="working">';
    html += '<li>Entropy per word = log<sub>2</sub>(' + result.wordlistSize + ') &approx; ' + (Math.round(result.entropyPerWord * 10000) / 10000) + ' bits</li>';
    html += '<li>Total entropy = ' + result.words.length + ' &times; ' + (Math.round(result.entropyPerWord * 10000) / 10000) + ' &approx; ' + (Math.round(result.entropyBits * 100) / 100) + ' bits</li>';
    html += '<li>Resistance: ' + result.resistance + '</li>';
    html += '</ul>';
    html += '<p><strong>Words drawn:</strong> ' + result.words.map(function (w) { return '<code>' + w + '</code>'; }).join(', ') + '.</p>';
    html += '<p>Wordlist source: EFF Short Wordlist #1, published by the Electronic Frontier Foundation in 2016. The full list of 1,296 words is baked into this page, so the draw is reproducible without any network call.</p>';
    proveItBody.innerHTML = html;
  }

  function generate() {
    var count = parseInt(wordCountEl.value, 10) || 6;
    var sep = sepEl.value;
    var cap = getCap();

    var result;
    try {
      result = lib.generate({
        wordCount: count,
        separator: sep,
        capitalisation: cap
      });
    } catch (err) {
      phraseEl.textContent = 'Your browser does not support secure randomness. Try a current version of Chrome, Firefox, Safari or Edge.';
      return;
    }

    phraseEl.textContent = result.passphrase;
    statWords.textContent = String(result.words.length);
    statEntropy.textContent = fmtBits(result.entropyBits);
    statResist.textContent = result.resistance;
    renderProveIt(result);

    pushResult({
      word_count: result.words.length,
      entropy_bits: Math.round(result.entropyBits * 100) / 100,
      separator: sep,
      capitalisation: cap
    });
  }

  // Live update of the word count label.
  wordCountEl.addEventListener('input', function () {
    wordCountVal.textContent = wordCountEl.value;
    pushInteraction('word_count');
  });
  sepEl.addEventListener('change', function () { pushInteraction('separator'); });
  for (var i = 0; i < capEls.length; i++) {
    capEls[i].addEventListener('change', function () { pushInteraction('capitalisation'); });
  }

  generateBtn.addEventListener('click', generate);

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var v = phraseEl.textContent || '';
      if (!v || v === 'Press Generate.') return;
      try {
        navigator.clipboard.writeText(v).then(function () {
          var prev = copyBtn.textContent;
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = prev; }, 1200);
        }, function () {});
      } catch (e) {}
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cta_click', calculator_name: CALC_NAME, action: 'copy_passphrase' });
    });
  }

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  // Generate one on load so the page does not look empty.
  generate();
})();
