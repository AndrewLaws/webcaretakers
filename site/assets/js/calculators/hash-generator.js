// Hash Generator. Browser-only. Uses Web Crypto (crypto.subtle.digest) for
// SHA-1, SHA-256, SHA-384 and SHA-512. No fetch, no XHR, no third-party libs.
// Big files are read in chunks via FileReader so the tab does not freeze.
(function () {
  'use strict';

  var ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
  var DEBOUNCE_MS = 150;
  var CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB at a time when streaming files

  function bufferToHex(buf) {
    var bytes = new Uint8Array(buf);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var h = bytes[i].toString(16);
      if (h.length === 1) h = '0' + h;
      out += h;
    }
    return out;
  }

  function bufferToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function strToUtf8Buffer(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).buffer;
    }
    // Fallback: percent-encode then map back to bytes
    var encoded = unescape(encodeURIComponent(str));
    var buf = new ArrayBuffer(encoded.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < encoded.length; i++) view[i] = encoded.charCodeAt(i);
    return buf;
  }

  // Constant-time hex comparison. Only meaningful when strings are the same
  // length, which we enforce by trimming and lower-casing both sides first.
  function constantTimeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  // Normalises an expected hash for comparison: trims whitespace and either
  // converts hex to lower case, or leaves base64 alone.
  function normaliseExpected(expected, format) {
    var trimmed = (expected || '').replace(/\s+/g, '');
    if (format === 'base64') return trimmed;
    return trimmed.toLowerCase();
  }

  function digestText(algo, text) {
    return crypto.subtle.digest(algo, strToUtf8Buffer(text));
  }

  // Streamed file digest. The Web Crypto API does not provide an "update"
  // primitive, so for very large files we fall back to a single digest of the
  // whole buffer once we have read the file end-to-end. The chunked read keeps
  // the UI responsive by yielding to the event loop between chunks and lets us
  // surface progress.
  function digestFile(algo, file, onProgress) {
    return readFileToBuffer(file, onProgress).then(function (buf) {
      return crypto.subtle.digest(algo, buf);
    });
  }

  function readFileToBuffer(file, onProgress) {
    return new Promise(function (resolve, reject) {
      if (typeof file.arrayBuffer === 'function' && file.size <= CHUNK_SIZE) {
        // Small file: single read.
        file.arrayBuffer().then(resolve).catch(reject);
        return;
      }
      // Larger file: read in chunks so we can show progress, then concatenate.
      var size = file.size;
      var offset = 0;
      var combined = new Uint8Array(size);
      var reader = new FileReader();

      reader.onerror = function () { reject(reader.error || new Error('Could not read file.')); };
      reader.onload = function () {
        var chunk = new Uint8Array(reader.result);
        combined.set(chunk, offset);
        offset += chunk.byteLength;
        if (typeof onProgress === 'function') onProgress(offset, size);
        if (offset >= size) {
          resolve(combined.buffer);
        } else {
          readNext();
        }
      };

      function readNext() {
        var slice = file.slice(offset, Math.min(offset + CHUNK_SIZE, size));
        reader.readAsArrayBuffer(slice);
      }
      readNext();
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function fmtBytes(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  // Expose pure helpers for tests
  window.HashGenerator = {
    ALGOS: ALGOS,
    bufferToHex: bufferToHex,
    bufferToBase64: bufferToBase64,
    constantTimeEqual: constantTimeEqual,
    digestText: digestText,
    digestFile: digestFile,
    fmtBytes: fmtBytes
  };

  function init() {
    var form = document.getElementById('hash-form');
    if (!form) return;

    var modeRadios = form.querySelectorAll('[data-mode]');
    var textPanel = form.querySelector('[data-text-panel]');
    var filePanel = form.querySelector('[data-file-panel]');
    var textInput = form.querySelector('[data-hash-text]');
    var fileInput = form.querySelector('[data-hash-file]');
    var dropZone = form.querySelector('[data-drop-zone]');
    var fileMeta = form.querySelector('[data-file-meta]');
    var fileProgress = form.querySelector('[data-file-progress]');
    var formatRadios = form.querySelectorAll('[data-format]');
    var rows = {};
    ALGOS.forEach(function (a) {
      rows[a] = document.querySelector('[data-hash-row="' + a + '"]');
    });

    // Track state
    var currentFormat = 'hex';
    var lastDigests = {}; // algo -> ArrayBuffer
    var firstInteractionFired = false;
    var lastResultFiredForState = '';

    function setMode(mode) {
      if (mode === 'file') {
        textPanel.hidden = true;
        filePanel.hidden = false;
      } else {
        textPanel.hidden = false;
        filePanel.hidden = true;
      }
    }

    function fireInteractionOnce() {
      if (firstInteractionFired) return;
      firstInteractionFired = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: 'Hash Generator'
      });
    }

    function fireResultOnce(stateKey, payload) {
      if (lastResultFiredForState === stateKey) return;
      lastResultFiredForState = stateKey;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({
        event: 'calculator_result',
        calculator_name: 'Hash Generator'
      }, payload));
    }

    function formatDigest(buf) {
      return currentFormat === 'base64' ? bufferToBase64(buf) : bufferToHex(buf);
    }

    function updateRow(algo) {
      var row = rows[algo];
      if (!row) return;
      var valueEl = row.querySelector('[data-hash-value]');
      var compareEl = row.querySelector('[data-compare-input]');
      var buf = lastDigests[algo];
      if (!buf) {
        valueEl.textContent = '';
        return;
      }
      var rendered = formatDigest(buf);
      valueEl.textContent = rendered;
      // Re-evaluate compare highlight for the new representation
      evaluateCompare(row, rendered, compareEl ? compareEl.value : '');
    }

    function evaluateCompare(row, current, expectedRaw) {
      row.classList.remove('hash-row--match');
      row.classList.remove('hash-row--mismatch');
      var expected = normaliseExpected(expectedRaw, currentFormat);
      if (!expected) return;
      var have = currentFormat === 'base64' ? current : current.toLowerCase();
      if (constantTimeEqual(have, expected)) {
        row.classList.add('hash-row--match');
      } else {
        row.classList.add('hash-row--mismatch');
      }
    }

    function renderAll() {
      ALGOS.forEach(updateRow);
    }

    // Hash whatever text is currently in the textarea (including empty string)
    function hashCurrentText() {
      fireInteractionOnce();
      var text = textInput.value;
      Promise.all(ALGOS.map(function (a) { return digestText(a, text); }))
        .then(function (results) {
          ALGOS.forEach(function (a, i) { lastDigests[a] = results[i]; });
          renderAll();
          fireResultOnce('text:' + text.length + ':' + bufferToHex(results[1]), {
            input_mode: 'text',
            input_length: text.length
          });
        })
        .catch(function (err) {
          console.error('Hash failed:', err);
        });
    }

    var debouncedHashText = debounce(hashCurrentText, DEBOUNCE_MS);

    // ----- Wire up text mode -----
    textInput.addEventListener('input', debouncedHashText);

    // ----- Wire up format toggle -----
    formatRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) {
          currentFormat = r.value;
          renderAll();
        }
      });
    });

    // ----- Wire up compare inputs -----
    Object.keys(rows).forEach(function (algo) {
      var row = rows[algo];
      if (!row) return;
      var cmp = row.querySelector('[data-compare-input]');
      if (!cmp) return;
      cmp.addEventListener('input', function () {
        var valEl = row.querySelector('[data-hash-value]');
        evaluateCompare(row, valEl.textContent || '', cmp.value);
      });
    });

    // ----- Wire up copy buttons -----
    Object.keys(rows).forEach(function (algo) {
      var row = rows[algo];
      if (!row) return;
      var btn = row.querySelector('[data-copy]');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var valEl = row.querySelector('[data-hash-value]');
        var v = valEl.textContent || '';
        if (!v) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(v).then(function () {
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1200);
          }).catch(function () {
            btn.textContent = 'Copy failed';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
          });
        }
      });
    });

    // ----- Wire up mode toggle -----
    modeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) setMode(r.value);
      });
    });

    // ----- File mode -----
    function handleFile(file) {
      if (!file) return;
      fireInteractionOnce();
      fileMeta.hidden = false;
      fileMeta.querySelector('[data-file-name]').textContent = file.name;
      fileMeta.querySelector('[data-file-size]').textContent = fmtBytes(file.size);
      fileMeta.querySelector('[data-file-modified]').textContent = file.lastModified
        ? new Date(file.lastModified).toISOString().slice(0, 19).replace('T', ' ')
        : 'unknown';

      // Clear existing values
      ALGOS.forEach(function (a) {
        var row = rows[a];
        if (!row) return;
        row.querySelector('[data-hash-value]').textContent = 'hashing…';
      });

      fileProgress.hidden = false;
      fileProgress.value = 0;

      // Read once, then digest each algo against the same buffer.
      readFileToBuffer(file, function (done, total) {
        fileProgress.max = total;
        fileProgress.value = done;
      }).then(function (buf) {
        return Promise.all(ALGOS.map(function (a) {
          return crypto.subtle.digest(a, buf);
        }));
      }).then(function (results) {
        ALGOS.forEach(function (a, i) { lastDigests[a] = results[i]; });
        renderAll();
        fileProgress.hidden = true;
        fireResultOnce('file:' + file.name + ':' + file.size, {
          input_mode: 'file',
          file_size: file.size
        });
      }).catch(function (err) {
        fileProgress.hidden = true;
        ALGOS.forEach(function (a) {
          var row = rows[a];
          if (!row) return;
          row.querySelector('[data-hash-value]').textContent = 'error: ' + (err && err.message || err);
        });
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      });
    }
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        dropZone.addEventListener(ev, function (e) {
          e.preventDefault();
          dropZone.classList.add('drop-zone--hover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dropZone.addEventListener(ev, function (e) {
          e.preventDefault();
          dropZone.classList.remove('drop-zone--hover');
        });
      });
      dropZone.addEventListener('drop', function (e) {
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleFile(f);
      });
    }

    // Kick off an initial hash so the empty-string canonical value shows up.
    hashCurrentText();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
