'use strict';

/**
 * SERP Snippet Preview Tool.
 *
 * The whole point of this calculator is that Google truncates SERP titles
 * and descriptions by pixel width, not by character count. A title of
 * "iiiiiiiiiiii" and a title of "WWWWWWWWWWWW" are the same character
 * count but vastly different rendered widths. Tools that count characters
 * are wrong by design.
 *
 * Approach:
 *   - In the browser we use a single off-screen 2D canvas
 *     (CanvasRenderingContext2D.measureText) to measure the actual rendered
 *     width of any string in the same font Google approximates with on
 *     desktop and mobile. Canvas is more reliable than DOM measurement
 *     for this because it returns sub-pixel widths and is unaffected by
 *     line-height, padding, or wrapping.
 *   - In Node tests we inject a deterministic measure function so the
 *     pure-function maths can be tested without a real canvas.
 *
 * Budgets (Google's current desktop and mobile SERP):
 *   Desktop title:   ~600px (Arial 20px approximation)
 *   Mobile title:    ~580px (Arial 20px, mobile wraps differently)
 *   Desktop desc:    ~990px across 2 lines (Arial 14px)
 *   Mobile desc:    ~1200px across 3 lines (Arial 14px)
 *
 * These are well-documented community numbers, not Google policy. Real
 * rendering varies by device DPI, browser font rendering, and Google's
 * own A/B tests.
 */

var ELLIPSIS = '...';

function measureWidth(text, font, measure) {
  if (!text) return 0;
  return measure(String(text), font);
}

/**
 * Cut a single-line string down so its rendered width plus the trailing
 * ellipsis fits inside the budget. If it already fits, return as-is.
 */
function truncateToWidth(text, budget, font, measure) {
  var s = String(text == null ? '' : text);
  if (!s) return { text: '', truncated: false, width: 0 };
  var full = measure(s, font);
  if (full <= budget) return { text: s, truncated: false, width: full };

  // Binary search for the longest prefix whose width with ellipsis fits.
  var ellipsisW = measure(ELLIPSIS, font);
  if (ellipsisW > budget) {
    // Budget is so small even an ellipsis does not fit. Return empty.
    return { text: '', truncated: true, width: 0 };
  }

  var lo = 0, hi = s.length, best = 0;
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    var candidate = s.slice(0, mid).replace(/\s+$/, '');
    var w = measure(candidate, font) + ellipsisW;
    if (w <= budget) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  var head = s.slice(0, best).replace(/\s+$/, '');
  var out = head + ELLIPSIS;
  return { text: out, truncated: true, width: measure(out, font) };
}

/**
 * Wrap a string into up to maxLines lines, each within budget pixels.
 * Splits on whitespace where possible. Hard newlines in the input force
 * a break. Words longer than the budget get force-broken character by
 * character. If content overflows the last line, the last line ends in
 * an ellipsis and `truncated` is true.
 */
function wrapToLines(text, budget, maxLines, font, measure) {
  var s = String(text == null ? '' : text);
  if (!s) return { lines: [''], truncated: false };

  // First, build a flat token stream that respects hard newlines as
  // explicit break tokens. That way we never lose a paragraph break.
  var tokens = [];
  var paragraphs = s.split(/\r?\n/);
  for (var p = 0; p < paragraphs.length; p++) {
    var words = paragraphs[p].split(/\s+/).filter(Boolean);
    for (var w = 0; w < words.length; w++) tokens.push({ type: 'word', value: words[w] });
    if (p < paragraphs.length - 1) tokens.push({ type: 'break' });
  }

  var lines = [''];
  var truncated = false;
  var leftoverIndex = -1;

  function fits(line) { return measure(line, font) <= budget; }

  for (var ti = 0; ti < tokens.length; ti++) {
    var tok = tokens[ti];
    if (tok.type === 'break') {
      if (lines.length === maxLines) {
        // Cannot start a new line, mark truncated and stop.
        truncated = true;
        leftoverIndex = ti + 1;
        break;
      }
      lines.push('');
      continue;
    }

    var word = tok.value;
    var current = lines[lines.length - 1];
    var trial = current ? (current + ' ' + word) : word;

    if (fits(trial)) {
      lines[lines.length - 1] = trial;
      continue;
    }

    // Word does not fit on this line. If the word itself is wider than
    // the budget and the current line is empty, force-break the word.
    if (!current && !fits(word)) {
      // Take as many chars as fit, leave the rest as a new pseudo-token.
      var fitChars = '';
      for (var ci = 0; ci < word.length; ci++) {
        var trialChars = fitChars + word.charAt(ci);
        if (!fits(trialChars)) break;
        fitChars = trialChars;
      }
      lines[lines.length - 1] = fitChars;
      var rest = word.slice(fitChars.length);
      // Move to the next line if possible.
      if (lines.length === maxLines) {
        truncated = true;
        // Reinsert the leftover so the truncation routine below knows
        // there is content beyond what fitted.
        tokens.splice(ti + 1, 0, { type: 'word', value: rest });
        leftoverIndex = ti + 1;
        break;
      }
      lines.push('');
      // Reinsert remainder so it goes on the next iteration.
      tokens.splice(ti + 1, 0, { type: 'word', value: rest });
      continue;
    }

    // Otherwise, the word will fit on a fresh line. Move on.
    if (lines.length === maxLines) {
      truncated = true;
      leftoverIndex = ti;
      break;
    }
    lines.push(word);
  }

  if (truncated) {
    // Take the last line and append the first overflow word(s) until the
    // line plus ellipsis no longer fits, then truncate. This produces a
    // last line that ends in "..." and respects the budget.
    var lastIndex = lines.length - 1;
    var build = lines[lastIndex] || '';
    for (var li = leftoverIndex; li < tokens.length; li++) {
      var t = tokens[li];
      if (t.type !== 'word') break;
      build = build ? (build + ' ' + t.value) : t.value;
    }
    var fitted = truncateToWidth(build, budget, font, measure);
    if (fitted.truncated) {
      lines[lastIndex] = fitted.text;
    } else {
      // Edge case: build fits, but content was lost (e.g. across a hard
      // break). Append ellipsis if it still fits the budget.
      var withEll = build.replace(/\s+$/, '') + ELLIPSIS;
      if (measure(withEll, font) <= budget) {
        lines[lastIndex] = withEll;
      } else {
        lines[lastIndex] = truncateToWidth(build, budget, font, measure).text;
      }
    }
  }

  if (!lines.length) lines.push('');
  return { lines: lines, truncated: truncated };
}

/**
 * Render a URL into the breadcrumb-style format Google uses:
 *   example.com > blog > 2024 > post-name
 *
 * Trailing slashes are stripped and empty segments are dropped.
 * Tests assert the literal "host > seg > seg" form; the UI swaps the
 * ASCII '>' for a chevron glyph at render time.
 */
function formatBreadcrumb(input) {
  if (!input) return '';
  var s = String(input).trim();
  if (!s) return '';

  var host = '';
  var pathPart = '';

  var schemeMatch = s.match(/^[a-z][a-z0-9+.-]*:\/\//i);
  var rest = schemeMatch ? s.slice(schemeMatch[0].length) : s;

  var slashAt = rest.indexOf('/');
  if (slashAt === -1) {
    host = rest;
    pathPart = '';
  } else {
    host = rest.slice(0, slashAt);
    pathPart = rest.slice(slashAt + 1);
  }

  // Strip query and hash from the path before splitting.
  var qAt = pathPart.search(/[?#]/);
  if (qAt !== -1) pathPart = pathPart.slice(0, qAt);

  var segments = pathPart.split('/').filter(function (seg) { return seg.length > 0; });

  var parts = host ? [host] : [];
  for (var i = 0; i < segments.length; i++) parts.push(segments[i]);
  return parts.join(' > ');
}

function analyseTitle(title, opts, measure) {
  var font = (opts && opts.font) || '700 20px Arial, sans-serif';
  var budget = (opts && opts.budget) || 600;
  var t = truncateToWidth(title || '', budget, font, measure);
  return {
    text: t.text,
    rawWidth: measureWidth(title || '', font, measure),
    width: t.width,
    truncated: t.truncated,
    budget: budget,
    font: font
  };
}

function analyseDescription(description, opts, measure) {
  var font = (opts && opts.font) || '14px Arial, sans-serif';
  var budget = (opts && opts.budget) || 990;
  var maxLines = (opts && opts.maxLines) || 2;
  var w = wrapToLines(description || '', budget, maxLines, font, measure);
  // The "width" we report is the width of the widest line.
  var widest = 0;
  for (var i = 0; i < w.lines.length; i++) {
    var lw = measureWidth(w.lines[i], font, measure);
    if (lw > widest) widest = lw;
  }
  return {
    lines: w.lines,
    truncated: w.truncated,
    width: widest,
    budget: budget,
    maxLines: maxLines,
    font: font,
    rawWidth: measureWidth(description || '', font, measure)
  };
}

var api = {
  measureWidth: measureWidth,
  truncateToWidth: truncateToWidth,
  wrapToLines: wrapToLines,
  formatBreadcrumb: formatBreadcrumb,
  analyseTitle: analyseTitle,
  analyseDescription: analyseDescription
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.SerpSnippetPreview = api;
}
