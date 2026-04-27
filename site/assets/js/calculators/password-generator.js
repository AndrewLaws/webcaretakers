// Password Generator — browser-only.
//
// All randomness comes from crypto.getRandomValues. Math.random is never used.
// Modulo bias is avoided with rejection sampling: we draw 32-bit values and
// discard any that fall in the unfair tail before reducing modulo the charset.
//
// Nothing here calls fetch, XMLHttpRequest, or any third-party endpoint.
// You can verify by disconnecting your network and pressing Generate.

(function () {
  'use strict';

  var LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var DIGITS = '0123456789';
  var SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/';
  var AMBIGUOUS = '0Oo1lI';

  // Pronounceable mode alternates consonant/vowel pairs. Easier to remember,
  // still drawn from a real entropy source. Mixed-case for a small lift in
  // search space.
  var CONS = 'bcdfghjklmnpqrstvwxz';
  var VOWELS = 'aeiouy';

  // Embedded short EFF-style wordlist. Roughly 512 short, common, easy-to-type
  // English words. Inline so the calculator works offline.
  var WORDLIST = [
    'able','acid','aged','also','area','army','away','baby','back','ball','band','bank','base','bath','bear','beat',
    'been','beer','bell','belt','best','bill','bird','blow','blue','boat','body','bomb','bond','bone','book','boom',
    'born','boss','both','bowl','bulk','burn','bush','busy','call','calm','came','camp','card','care','case','cash',
    'cast','cell','chat','chip','city','club','coal','coat','code','cold','come','cook','cool','cope','copy','core',
    'corn','cost','crew','crop','dare','dark','data','date','dawn','days','dead','deal','dean','dear','debt','deep',
    'deny','desk','dial','dice','diet','disc','disk','does','done','door','dose','down','draw','drew','drop','drug',
    'dual','duke','dust','duty','each','earn','ease','east','easy','edge','else','even','ever','evil','exit','face',
    'fact','fail','fair','fall','farm','fast','fate','fear','feed','feel','feet','fell','felt','file','fill','film',
    'find','fine','fire','firm','fish','five','flag','flat','flew','flow','folk','food','foot','ford','form','fort',
    'four','free','from','fuel','full','fund','gain','game','gate','gave','gear','gene','gift','girl','give','glad',
    'goal','goes','gold','golf','gone','good','gray','grew','grow','gulf','hair','half','hall','hand','hang','hard',
    'harm','hate','have','head','hear','heat','held','hell','help','here','hero','high','hill','hint','hire','hold',
    'hole','holy','home','hope','horn','host','hour','huge','hung','hunt','hurt','idea','inch','into','iron','item',
    'jack','jane','jean','jest','john','join','jump','june','jury','just','keen','keep','kept','kick','kill','kind',
    'king','knee','knew','know','lack','lady','laid','lake','land','lane','last','late','lawn','lazy','lead','leaf',
    'lean','left','legs','lend','less','life','lift','like','limb','line','link','lion','list','live','load','loan',
    'lock','logo','long','look','lord','lose','loss','lost','loud','love','luck','made','mail','main','make','many',
    'mark','mass','math','meal','mean','meat','meet','menu','mere','mike','mild','mile','milk','mill','mind','mine',
    'miss','mode','mood','moon','more','most','move','much','must','myth','name','navy','near','neck','need','news',
    'next','nice','nick','nine','none','nose','note','noun','okay','once','only','onto','open','oral','over','pace',
    'pack','page','paid','pain','pair','palm','park','part','pass','past','path','peak','pick','pile','pine','pink',
    'pipe','plan','play','plot','plug','plus','poem','poet','poll','pool','poor','port','pose','post','pour','pull',
    'pure','push','quit','race','rage','rain','rank','rare','rate','read','real','rear','reed','rely','rent','rest',
    'rice','rich','ride','ring','rise','risk','road','rock','role','roll','roof','room','root','rope','rose','rude',
    'ruin','rule','runs','rush','safe','said','sake','sale','salt','same','sand','save','seat','seed','seek','seem',
    'seen','self','sell','send','sent','sept','sets','shed','ship','shoe','shop','shot','show','shut','sick','side',
    'sign','silk','sing','sink','site','size','skin','skip','slip','slow','snap','snow','soft','soil','sold','sole',
    'some','song','soon','sort','soul','soup','spin','spot','star','stay','step','stop','such','suit','sunk','sure',
    'swam','swim','tail','take','tale','talk','tall','tank','tape','task','team','tear','tell','tend','term','test',
    'text','than','that','them','then','they','thin','this','thus','tide','tied','tier','ties','time','tiny','tips',
    'tire','told','tone','took','tool','torn','tour','town','trim','trip','true','tube','tune','turn','twin','type',
    'ugly','unit','upon','urge','used','user','uses','vain','vary','vast','very','vice','view','visa','void','vote',
    'wage','wait','wake','walk','wall','want','ward','warm','warn','wash','wave','ways','weak','wear','week','well',
    'went','were','west','what','when','whom','wide','wife','wild','will','wind','wine','wing','wipe','wire','wise',
    'wish','with','wood','wool','word','wore','work','worn','wrap','yard','yarn','yeah','year','yell','your','zero','zone'
  ];

  // Draw an unbiased random integer in [0, n) by rejection sampling on Uint32.
  // We discard any value at or above the largest multiple of n that fits in
  // 2^32, which removes the bias that a naive (rand % n) introduces.
  function randomInt(n) {
    if (n <= 0) throw new Error('randomInt: n must be positive');
    var max = 0xFFFFFFFF;
    var limit = max - (max % n) - 1;
    var buf = new Uint32Array(1);
    while (true) {
      crypto.getRandomValues(buf);
      if (buf[0] <= limit) return buf[0] % n;
    }
  }

  function pickFrom(str) {
    return str.charAt(randomInt(str.length));
  }

  function buildCharset(opts) {
    var pool = '';
    if (opts.lowercase) pool += LOWER;
    if (opts.uppercase) pool += UPPER;
    if (opts.digits) pool += DIGITS;
    if (opts.symbols) pool += SYMBOLS;
    if (opts.excludeAmbiguous) {
      var filtered = '';
      for (var i = 0; i < pool.length; i++) {
        if (AMBIGUOUS.indexOf(pool.charAt(i)) === -1) filtered += pool.charAt(i);
      }
      pool = filtered;
    }
    // Deduplicate so the entropy maths matches the real charset size.
    var seen = {};
    var deduped = '';
    for (var j = 0; j < pool.length; j++) {
      var c = pool.charAt(j);
      if (!seen[c]) { seen[c] = true; deduped += c; }
    }
    return deduped;
  }

  function generateRandom(opts) {
    var charset = buildCharset(opts);
    if (!charset) throw new Error('Pick at least one character class.');
    var length = opts.length;
    if (opts.noRepeats && length > charset.length) {
      throw new Error('No repeats requires length no greater than charset size (' + charset.length + ').');
    }
    var out = '';
    var used = {};
    var safety = length * 50;
    while (out.length < length) {
      if (safety-- <= 0) break;
      var ch = pickFrom(charset);
      if (opts.noRepeats && used[ch]) continue;
      out += ch;
      used[ch] = true;
    }
    return out;
  }

  function generatePronounceable(length) {
    // Alternate consonant and vowel, occasionally upper-casing one for variety.
    var out = '';
    var startWithCons = randomInt(2) === 0;
    for (var i = 0; i < length; i++) {
      var pickCons = startWithCons ? (i % 2 === 0) : (i % 2 === 1);
      var src = pickCons ? CONS : VOWELS;
      var ch = src.charAt(randomInt(src.length));
      // ~25% chance of upper-casing this letter.
      if (randomInt(4) === 0) ch = ch.toUpperCase();
      out += ch;
    }
    return out;
  }

  function generatePassphrase(opts) {
    var words = [];
    for (var i = 0; i < opts.words; i++) {
      words.push(WORDLIST[randomInt(WORDLIST.length)]);
    }
    var sep = opts.separator || '-';
    if (sep === 'none') sep = '';
    return words.join(sep);
  }

  function entropyBits(charsetSize, length) {
    if (charsetSize <= 1 || length <= 0) return 0;
    return Math.log2(charsetSize) * length;
  }

  function passphraseEntropyBits(words) {
    return Math.log2(WORDLIST.length) * words;
  }

  function rateEntropy(bits) {
    if (bits < 40) return 'Weak';
    if (bits < 60) return 'Fair';
    if (bits < 80) return 'Strong';
    return 'Very strong';
  }

  // Crack-time at offline-fast-hash assumption: 10 billion guesses/sec.
  function crackTime(bits) {
    var guessesPerSec = 1e10;
    var seconds = Math.pow(2, bits) / guessesPerSec / 2; // average half the keyspace
    if (!isFinite(seconds)) return 'longer than the heat death of the universe';
    if (seconds < 1) return 'less than a second';
    var units = [
      ['second', 60],
      ['minute', 60],
      ['hour', 24],
      ['day', 365.25],
      ['year', 1000],
      ['millennium', 1000],
      ['million years', 1000],
      ['billion years', 1000]
    ];
    var n = seconds;
    for (var i = 0; i < units.length; i++) {
      if (n < units[i][1]) {
        var rounded = n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-GB');
        return rounded + ' ' + units[i][0] + (n === 1 ? '' : 's');
      }
      n = n / units[i][1];
    }
    return 'longer than the age of the universe';
  }

  // Expose for tests and for the inline page script.
  window.PasswordGenerator = {
    LOWER: LOWER,
    UPPER: UPPER,
    DIGITS: DIGITS,
    SYMBOLS: SYMBOLS,
    AMBIGUOUS: AMBIGUOUS,
    WORDLIST: WORDLIST,
    randomInt: randomInt,
    buildCharset: buildCharset,
    generateRandom: generateRandom,
    generatePronounceable: generatePronounceable,
    generatePassphrase: generatePassphrase,
    entropyBits: entropyBits,
    passphraseEntropyBits: passphraseEntropyBits,
    rateEntropy: rateEntropy,
    crackTime: crackTime
  };
})();
