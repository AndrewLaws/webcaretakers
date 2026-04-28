'use strict';

/**
 * Robots.txt Tester.
 *
 * Pure parsing and matching functions that follow Google's robots.txt
 * specification rather than a naive longest-line wins approach. The
 * decision rules:
 *
 *   1. Group lines by User-agent. Consecutive User-agent lines share the
 *      same rule block. Directive names are case-insensitive, UA names
 *      compare case-insensitively, paths are case-sensitive.
 *   2. For a given UA, pick the most specific group: an exact-ish match
 *      (the longest agent token that is a prefix of the requested UA)
 *      beats a less specific one. Fall back to the * group if nothing
 *      else matches. If neither exists, everything is allowed.
 *   3. Within the matching group, evaluate every Allow and Disallow rule
 *      against the path. The rule with the longest matching pattern wins.
 *      On a tie, Allow beats Disallow.
 *   4. Wildcards: '*' matches any sequence (including empty), '$' anchors
 *      the end of the URL. An empty Disallow is a no-op (allow). An empty
 *      Allow is a no-op (no effect).
 */

function parse(input) {
  var lines = String(input == null ? '' : input).split(/\r?\n/);
  var groups = [];
  var sitemaps = [];
  var warnings = [];

  var current = null;
  // True when the previous non-blank, non-comment line was a User-agent.
  // Consecutive UA lines build the same group; once a rule appears, the
  // next UA line starts a new group.
  var lastWasAgent = false;

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    // Strip comments anywhere on the line.
    var hashAt = raw.indexOf('#');
    var line = (hashAt >= 0 ? raw.slice(0, hashAt) : raw).trim();
    if (!line) continue;

    var colon = line.indexOf(':');
    if (colon === -1) {
      warnings.push({ line: i + 1, text: raw, reason: 'no colon' });
      continue;
    }
    var directive = line.slice(0, colon).trim().toLowerCase();
    var value = line.slice(colon + 1).trim();

    if (directive === 'user-agent') {
      if (!value) {
        warnings.push({ line: i + 1, text: raw, reason: 'empty user-agent' });
        continue;
      }
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
    } else if (directive === 'allow' || directive === 'disallow') {
      if (!current) {
        // Rule before any User-agent line: per Google, this is treated as
        // belonging to no group. We keep it as a warning rather than
        // silently attaching it to *.
        warnings.push({ line: i + 1, text: raw, reason: 'rule before user-agent' });
        continue;
      }
      current.rules.push({ type: directive, path: value, line: i + 1 });
      lastWasAgent = false;
    } else if (directive === 'sitemap') {
      if (value) sitemaps.push(value);
      // Sitemap lines do not belong to any group, so do not affect lastWasAgent
      // for the purposes of group continuation.
    } else if (directive === 'crawl-delay' || directive === 'host' || directive === 'noindex') {
      // Recognised but ignored for allow/block decisions.
      lastWasAgent = false;
    } else {
      warnings.push({ line: i + 1, text: raw, reason: 'unknown directive: ' + directive });
    }
  }

  return { groups: groups, sitemaps: sitemaps, warnings: warnings };
}

/**
 * Pick the best-matching group for a requested user-agent.
 *
 * Google's rule: the most specific agent token wins. We compare on the
 * longest UA token whose lowercased value is a prefix of the requested
 * UA's lowercased value. The * group is only used if nothing else matched.
 */
function pickGroup(parsed, ua) {
  var requested = String(ua || '').toLowerCase();
  var best = null;
  var bestLen = -1;
  var starGroup = null;
  var matchedAgent = null;

  for (var i = 0; i < parsed.groups.length; i++) {
    var g = parsed.groups[i];
    for (var j = 0; j < g.agents.length; j++) {
      var token = g.agents[j];
      var lc = token.toLowerCase();
      if (lc === '*') {
        starGroup = g;
        continue;
      }
      // Per Google, the requested UA matches a group token if the token is
      // a prefix of the UA name. Most specific (longest) wins.
      if (requested && requested.indexOf(lc) === 0) {
        if (lc.length > bestLen) {
          best = g;
          bestLen = lc.length;
          matchedAgent = token;
        }
      }
    }
  }

  if (best) return { group: best, matchedAgent: matchedAgent };
  if (starGroup) return { group: starGroup, matchedAgent: '*' };
  return { group: null, matchedAgent: null };
}

/**
 * Convert a robots.txt path pattern into a regex.
 *
 * '*' is any sequence of characters (including empty). '$' at the end
 * anchors. Everything else is a literal. Patterns are not anchored at
 * the end unless '$' is present, but they are always anchored at the
 * start of the URL path.
 */
function patternToRegex(pattern) {
  var anchorEnd = false;
  var p = pattern;
  if (p.charAt(p.length - 1) === '$') {
    anchorEnd = true;
    p = p.slice(0, -1);
  }
  // Escape regex metacharacters except *.
  var escaped = '';
  for (var i = 0; i < p.length; i++) {
    var ch = p.charAt(i);
    if (ch === '*') {
      escaped += '.*';
    } else if ('.+?^$()[]{}|\\/'.indexOf(ch) !== -1) {
      escaped += '\\' + ch;
    } else {
      escaped += ch;
    }
  }
  return new RegExp('^' + escaped + (anchorEnd ? '$' : ''));
}

/**
 * Length of a pattern for the longest-match rule. Per Google, length is
 * the character length of the pattern itself (wildcards count as one
 * character), with the trailing '$' not counted.
 */
function patternLength(pattern) {
  if (!pattern) return 0;
  if (pattern.charAt(pattern.length - 1) === '$') return pattern.length - 1;
  return pattern.length;
}

function normalisePath(input) {
  var s = String(input == null ? '' : input).trim();
  if (!s) return '/';
  // If it looks like a full URL, strip scheme + host.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    try {
      var u = new URL(s);
      return (u.pathname || '/') + (u.search || '');
    } catch (e) {
      // fall through to manual handling
    }
  }
  if (s.charAt(0) !== '/') s = '/' + s;
  return s;
}

function evaluate(group, path) {
  // Empty Disallow rules are explicitly "allow everything for this UA"
  // and we represent that by a no-op (they never match anything below).
  // Empty Allow rules are also no-ops.
  var candidates = [];
  for (var i = 0; i < group.rules.length; i++) {
    var rule = group.rules[i];
    var pattern = rule.path;
    var matches = false;
    var len = patternLength(pattern);

    if (!pattern) {
      // Empty value. Disallow: <empty> means allow-all (no rule). Allow:
      // <empty> is a no-op. Either way, this rule does not contribute a
      // matching candidate.
      candidates.push({ rule: rule, matches: false, length: 0, note: 'empty value' });
      continue;
    }

    try {
      var re = patternToRegex(pattern);
      matches = re.test(path);
    } catch (e) {
      matches = false;
    }
    candidates.push({ rule: rule, matches: matches, length: len });
  }

  // Pick the winner: longest matching pattern. Tie-break: allow beats disallow.
  var winner = null;
  for (var k = 0; k < candidates.length; k++) {
    var c = candidates[k];
    if (!c.matches) continue;
    if (!winner) { winner = c; continue; }
    if (c.length > winner.length) {
      winner = c;
    } else if (c.length === winner.length && c.rule.type === 'allow' && winner.rule.type === 'disallow') {
      winner = c;
    }
  }
  return { winner: winner, candidates: candidates };
}

function testOne(parsed, opts) {
  opts = opts || {};
  var ua = opts.userAgent == null ? '*' : String(opts.userAgent);
  var path = normalisePath(opts.url);

  var picked = pickGroup(parsed, ua);
  if (!picked.group) {
    return {
      allowed: true,
      path: path,
      userAgent: ua,
      matchedAgent: null,
      winningRule: null,
      candidates: [],
      reason: 'No matching group and no * group, default is allow.'
    };
  }

  var ev = evaluate(picked.group, path);
  if (!ev.winner) {
    return {
      allowed: true,
      path: path,
      userAgent: ua,
      matchedAgent: picked.matchedAgent,
      winningRule: null,
      candidates: ev.candidates,
      reason: 'Group matched but no rule matched the path, default is allow.'
    };
  }

  var allowed = ev.winner.rule.type === 'allow';
  return {
    allowed: allowed,
    path: path,
    userAgent: ua,
    matchedAgent: picked.matchedAgent,
    winningRule: ev.winner.rule,
    winningLength: ev.winner.length,
    candidates: ev.candidates,
    reason: allowed
      ? 'Longest matching rule is Allow ' + ev.winner.rule.path + '.'
      : 'Longest matching rule is Disallow ' + ev.winner.rule.path + '.'
  };
}

function testMany(parsed, opts) {
  opts = opts || {};
  var urls = Array.isArray(opts.urls) ? opts.urls : [];
  var ua = opts.userAgent;
  var rows = [];
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i];
    if (typeof u !== 'string') continue;
    var trimmed = u.trim();
    if (!trimmed) continue;
    rows.push(testOne(parsed, { url: trimmed, userAgent: ua }));
  }
  return rows;
}

var api = {
  parse: parse,
  test: testOne,
  testMany: testMany,
  pickGroup: pickGroup,
  patternToRegex: patternToRegex,
  patternLength: patternLength,
  normalisePath: normalisePath
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.RobotsTxtTester = api;
}
