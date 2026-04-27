'use strict';

/**
 * Password Strength Calculator: pure-logic library.
 *
 * Runs entirely in the browser. Nothing in this file performs I/O, fetches
 * a URL, or contacts a server. The only external state is a static list of
 * the most common passwords, embedded as a JS Set.
 *
 * Score model:
 *   1. Compute charset size from observed character classes.
 *   2. Entropy = log2(charset) * length, in bits.
 *   3. Apply penalties for: common password membership, keyboard runs,
 *      repeated characters, dictionary stems, year-shaped numbers.
 *   4. Map adjusted entropy to one of five rating buckets.
 *   5. Estimate crack time at three threat models from raw entropy.
 */

// A curated list of common passwords. Real-world breach lists run to tens of
// millions. Shipping the full list would bloat the page; this 300-entry
// subset catches every password that turns up in the top of every leaked
// dump (RockYou, Have I Been Pwned, Adobe, LinkedIn). If a candidate matches
// any of these, the score collapses to "very weak" regardless of length.
var COMMON_PASSWORDS = new Set([
  '123456','password','12345678','qwerty','123456789','12345','1234','111111',
  '1234567','dragon','123123','baseball','abc123','football','monkey','letmein',
  '696969','shadow','master','666666','qwertyuiop','123321','mustang','1234567890',
  'michael','654321','superman','1qaz2wsx','7777777','121212','000000','qazwsx',
  '123qwe','killer','trustno1','jordan','jennifer','zxcvbnm','asdfgh','hunter',
  'buster','soccer','harley','batman','andrew','tigger','sunshine','iloveyou',
  'fuckme','2000','charlie','robert','thomas','hockey','ranger','daniel',
  'starwars','klaster','112233','george','asshole','computer','michelle','jessica',
  'pepper','1111','zxcvbn','555555','11111111','131313','freedom','777777',
  'pass','fuck','maggie','159753','aaaaaa','ginger','princess','joshua',
  'cheese','amanda','summer','love','ashley','6969','nicole','chelsea',
  'biteme','matthew','access','yankees','987654321','dallas','austin','thunder',
  'taylor','matrix','william','corvette','hello','martin','heather','secret',
  'fucker','merlin','diamond','1234qwer','gfhjkm','hammer','silver','222222',
  '88888888','anthony','justin','test','bailey','q1w2e3r4t5','patrick','internet',
  'scooter','orange','11111','golfer','cookie','richard','samantha','bigdog',
  'guitar','jackson','whatever','mickey','chicken','sparky','snoopy','maverick',
  'phoenix','camaro','sexy','peanut','morgan','welcome','falcon','cowboy',
  'ferrari','samsung','andrea','smokey','steelers','joseph','mercedes','dakota',
  'arsenal','eagles','melissa','boomer','booboo','spider','nascar','monster',
  'tigers','yellow','xxxxxx','123123123','gateway','marina','diablo','bulldog',
  'qwer1234','compaq','purple','hardcore','banana','junior','hannah','123654',
  'porsche','lakers','iceman','money','cowboys','987654','london','tennis',
  'qwerty123','999999','passw0rd','liverpool','password1','jordan23','eagle1','shelby',
  'america','11111111','airborne','11111','redskins','smith','crystal','1qazxsw2',
  'success','starter','manager','letmein1','master1','admin','administrator','root',
  'oracle','postgres','toor','1q2w3e4r','q1w2e3','passwd','password123','abc',
  'abcdef','azerty','baby','barbie','beach','bear','beautiful','beauty',
  'beer','believe','blink182','blue','bond007','booger','boots','brandon',
  'brian','bronco','bubba','butter','calvin','canada','captain','carlos',
  'carter','casper','chester','chicago','chris','cocacola','coffee','college',
  'connor','cooper','dolphin','dolphins','donald','eclipse','enter','eric',
  'fish','fishing','flower','forever','forest','frank','fred','friend',
  'gandalf','green','hello123','helpme','horse','iloveu','jasmine','jasper',
  'john','johnson','joker','kelly','kevin','knight','legend','lovers',
  'mario','maxwell','mike','miller','muffin','murphy','newyork','ninja',
  'paris','peaches','phantom','phoenix','pizza','player','pookie','pumpkin',
  'qazwsxedc','rabbit','rachel','rainbow','rebecca','rocky','rose','royal',
  'rugby','sammy','scott','sexsex','shannon','sierra','single','skippy',
  'slayer','snickers','spanky','sprite','star','stella','stupid','summer',
  'sweet','sydney','tucker','turtle','victor','vincent','viper','wilson',
  'winner','winter','wizard','wolf','woody','wright','yamaha','yankee',
  'zaq12wsx','zaq1zaq1','test123','user','guest','demo','default','changeme',
  'p@ssw0rd','p@ssword','passw0rd','qwerty1','qwerty12','qwerty123','asdf',
  'asdfg','asdfgh','asdfghjk','asdfghjkl','password!','letmein!','welcome1',
  'football1','baseball1','google','facebook','twitter','youtube'
]);

// Common keyboard runs (lowercased). Substring presence gets a penalty.
var KEYBOARD_RUNS = [
  'qwerty','asdfgh','zxcvbn','12345','23456','34567','45678','56789','67890',
  '09876','98765','87654','76543','65432','54321','qwertyuiop','asdfghjkl',
  'zxcvbnm','1qaz','2wsx','3edc','4rfv','5tgb','qazwsx','1q2w3e','q1w2e3'
];

// Common English dictionary stems. Substring presence (case-insensitive) gets
// a smaller penalty, on the basis that adding "monkey" to a long random string
// barely matters but "monkey1" matters a lot.
var DICTIONARY_STEMS = [
  'password','admin','login','welcome','dragon','monkey','master','shadow',
  'letmein','sunshine','princess','football','baseball','superman','batman',
  'iloveyou','michael','jennifer','charlie','jessica','andrew','ashley',
  'matthew','daniel','joshua','jordan','taylor','william','hello','secret'
];

function classifyChars(pw) {
  var lower = false, upper = false, digit = false, symbol = false;
  for (var i = 0; i < pw.length; i++) {
    var c = pw.charCodeAt(i);
    if (c >= 97 && c <= 122) lower = true;
    else if (c >= 65 && c <= 90) upper = true;
    else if (c >= 48 && c <= 57) digit = true;
    else symbol = true;
  }
  return { lower: lower, upper: upper, digit: digit, symbol: symbol };
}

function charsetSize(classes) {
  var size = 0;
  if (classes.lower) size += 26;
  if (classes.upper) size += 26;
  if (classes.digit) size += 10;
  if (classes.symbol) size += 33; // common printable symbols
  return size;
}

function rawEntropyBits(pw) {
  if (!pw) return 0;
  var classes = classifyChars(pw);
  var size = charsetSize(classes);
  if (size === 0) return 0;
  return Math.log2(size) * pw.length;
}

function findIssues(pw) {
  var issues = [];
  if (!pw) return issues;
  var lower = pw.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    issues.push({ code: 'common', text: 'This password is in public breach lists. Attackers try it within seconds.' });
  }

  if (pw.length < 8) {
    issues.push({ code: 'short', text: 'Length is under 8 characters. Anything shorter than 12 is brittle.' });
  } else if (pw.length < 12) {
    issues.push({ code: 'mid-short', text: 'Length is under 12 characters. Aim for 14 or more for serious accounts.' });
  }

  for (var i = 0; i < KEYBOARD_RUNS.length; i++) {
    if (lower.indexOf(KEYBOARD_RUNS[i]) !== -1) {
      issues.push({ code: 'keyboard-run', text: 'Contains a keyboard run (' + KEYBOARD_RUNS[i] + '). Cracking tools try these first.' });
      break;
    }
  }

  // Repeated characters: 3+ of the same character in a row
  if (/(.)\1{2,}/.test(pw)) {
    issues.push({ code: 'repeats', text: 'Contains a run of three or more repeated characters.' });
  }

  // Year 1900-2099
  if (/(19|20)\d{2}/.test(pw)) {
    issues.push({ code: 'year', text: 'Contains a four-digit year. Birth years and graduation years are tried early.' });
  }

  // Dictionary stems
  for (var j = 0; j < DICTIONARY_STEMS.length; j++) {
    if (lower.indexOf(DICTIONARY_STEMS[j]) !== -1) {
      issues.push({ code: 'dictionary', text: 'Contains a common dictionary word (' + DICTIONARY_STEMS[j] + ').' });
      break;
    }
  }

  var classes = classifyChars(pw);
  var classCount = (classes.lower ? 1 : 0) + (classes.upper ? 1 : 0) + (classes.digit ? 1 : 0) + (classes.symbol ? 1 : 0);
  if (classCount < 2) {
    issues.push({ code: 'one-class', text: 'Uses only one type of character. Mixing classes helps a little; length helps far more.' });
  }

  return issues;
}

function buildSuggestions(pw, issues) {
  var s = [];
  var codes = {};
  issues.forEach(function (i) { codes[i.code] = true; });

  if (codes.common) {
    s.push('Pick a password that is not on any common-password list. A passphrase of three or four random words is a good default.');
  }
  if (codes.short || codes['mid-short']) {
    s.push('Make it longer. Each extra character roughly doubles the time to crack it.');
  }
  if (codes['keyboard-run']) {
    s.push('Avoid keyboard patterns like qwerty or 12345. Cracking tools try these in the first second.');
  }
  if (codes.repeats) {
    s.push('Break up repeated characters. "aaaa" is barely better than "a".');
  }
  if (codes.year) {
    s.push('Drop the year. Birth years and graduation years are guessed early.');
  }
  if (codes.dictionary) {
    s.push('Avoid recognisable dictionary words. If you must include one, bury it inside random characters.');
  }
  if (codes['one-class']) {
    s.push('Mix in at least one character class you are not using yet (uppercase, digits, or symbols).');
  }

  if (s.length === 0 && pw && pw.length >= 14) {
    s.push('This is a strong password. Use a password manager so you only ever need to remember one.');
  }

  return s;
}

// Penalty in bits, applied to the raw entropy estimate. Common-password
// membership zeros the score outright. Other issues knock 6-12 bits each.
function penaltyBits(issues) {
  if (!issues || issues.length === 0) return 0;
  for (var i = 0; i < issues.length; i++) {
    if (issues[i].code === 'common') return Infinity;
  }
  var total = 0;
  issues.forEach(function (it) {
    switch (it.code) {
      case 'short': total += 14; break;
      case 'mid-short': total += 6; break;
      case 'keyboard-run': total += 12; break;
      case 'repeats': total += 6; break;
      case 'year': total += 8; break;
      case 'dictionary': total += 10; break;
      case 'one-class': total += 6; break;
      default: total += 0;
    }
  });
  return total;
}

// Adjusted entropy, floored at 0.
function adjustedEntropyBits(pw) {
  var raw = rawEntropyBits(pw);
  var pen = penaltyBits(findIssues(pw));
  if (pen === Infinity) return 0;
  return Math.max(0, raw - pen);
}

// Five-level rating.
function rate(adjustedBits) {
  if (adjustedBits < 28)  return { level: 1, label: 'Very Weak',   colour: '#c0392b' };
  if (adjustedBits < 36)  return { level: 2, label: 'Weak',        colour: '#e67e22' };
  if (adjustedBits < 60)  return { level: 3, label: 'Fair',        colour: '#f1c40f' };
  if (adjustedBits < 80)  return { level: 4, label: 'Strong',      colour: '#2ecc71' };
  return                       { level: 5, label: 'Very Strong', colour: '#27ae60' };
}

// Crack-time estimate at a given guesses-per-second rate.
// Treats the search space as 2^bits, divides by half (average attacker finds
// it halfway through the space), and converts to a human-readable string.
function crackTime(bits, guessesPerSecond) {
  if (bits <= 0 || !isFinite(bits)) return 'instantly';
  // Average case: half the space.
  // Use logs to avoid overflow at high bit counts.
  var log2Seconds = bits - 1 - Math.log2(guessesPerSecond);
  if (log2Seconds < 0) return 'instantly';
  // Convert to seconds via exp; cap if it overflows.
  if (log2Seconds > 200) return 'centuries';
  var seconds = Math.pow(2, log2Seconds);
  return humanDuration(seconds);
}

function humanDuration(seconds) {
  if (seconds < 1) return 'instantly';
  if (seconds < 60) return Math.round(seconds) + ' seconds';
  var minutes = seconds / 60;
  if (minutes < 60) return Math.round(minutes) + ' minutes';
  var hours = minutes / 60;
  if (hours < 24) return Math.round(hours) + ' hours';
  var days = hours / 24;
  if (days < 30) return Math.round(days) + ' days';
  var months = days / 30.4375;
  if (months < 12) return Math.round(months) + ' months';
  var years = days / 365.25;
  if (years < 1000) return Math.round(years).toLocaleString('en-GB') + ' years';
  if (years < 1e6) return Math.round(years / 1000) + ' thousand years';
  if (years < 1e9) return Math.round(years / 1e6) + ' million years';
  if (years < 1e12) return Math.round(years / 1e9) + ' billion years';
  return 'centuries';
}

// Three threat models, rounded numbers used everywhere in the security press.
var THREAT_MODELS = {
  onlineThrottled:  { rate: 10,         label: 'Online attack, throttled (10 guesses/second)' },
  onlineUnthrottled:{ rate: 10000,      label: 'Online attack, unthrottled (10,000 guesses/second)' },
  offlineFast:      { rate: 10000000000, label: 'Offline attack, fast hash (10 billion guesses/second)' }
};

function assess(pw) {
  var classes = classifyChars(pw || '');
  var size = charsetSize(classes);
  var raw = rawEntropyBits(pw || '');
  var issues = findIssues(pw || '');
  var pen = penaltyBits(issues);
  var adjusted = (pen === Infinity) ? 0 : Math.max(0, raw - pen);
  var rating = rate(adjusted);
  var suggestions = buildSuggestions(pw || '', issues);

  var crackTimes = {
    onlineThrottled:   crackTime(adjusted, THREAT_MODELS.onlineThrottled.rate),
    onlineUnthrottled: crackTime(adjusted, THREAT_MODELS.onlineUnthrottled.rate),
    offlineFast:       crackTime(adjusted, THREAT_MODELS.offlineFast.rate)
  };

  return {
    length: (pw || '').length,
    classes: classes,
    charsetSize: size,
    rawEntropyBits: raw,
    penaltyBits: (pen === Infinity) ? raw : pen,
    adjustedEntropyBits: adjusted,
    rating: rating,
    issues: issues,
    suggestions: suggestions,
    crackTimes: crackTimes,
    inCommonList: COMMON_PASSWORDS.has((pw || '').toLowerCase())
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    assess: assess,
    classifyChars: classifyChars,
    charsetSize: charsetSize,
    rawEntropyBits: rawEntropyBits,
    adjustedEntropyBits: adjustedEntropyBits,
    rate: rate,
    crackTime: crackTime,
    humanDuration: humanDuration,
    findIssues: findIssues,
    COMMON_PASSWORDS: COMMON_PASSWORDS,
    THREAT_MODELS: THREAT_MODELS
  };
}
if (typeof window !== 'undefined') {
  window.PasswordStrength = {
    assess: assess,
    classifyChars: classifyChars,
    charsetSize: charsetSize,
    rawEntropyBits: rawEntropyBits,
    adjustedEntropyBits: adjustedEntropyBits,
    rate: rate,
    crackTime: crackTime,
    humanDuration: humanDuration,
    findIssues: findIssues,
    THREAT_MODELS: THREAT_MODELS
  };
}
