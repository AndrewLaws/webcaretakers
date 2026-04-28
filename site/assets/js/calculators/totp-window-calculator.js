(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TotpWindowCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  var ALGOS = ['SHA1', 'SHA256', 'SHA512'];
  var DIGIT_OPTIONS = [6, 7, 8];

  // Acceptance window in seconds is (1 + 2*drift) steps multiplied by the period.
  // RFC 6238 section 5.2 calls this the "validation window" of accepted time-steps.
  function acceptanceWindowSeconds(opts) {
    var period = Number(opts.period);
    var drift = Number(opts.drift);
    return (1 + 2 * drift) * period;
  }

  // Per-attempt guess probability and 1-in-N representation.
  // (1 + 2*drift) accepted codes out of 10^digits possible code values.
  function guessSpace(opts) {
    var digits = Number(opts.digits);
    var drift = Number(opts.drift);
    var accepted = 1 + 2 * drift;
    var space = Math.pow(10, digits);
    var probability = accepted / space;
    return {
      acceptedCodes: accepted,
      codeSpace: space,
      probability: probability,
      oneInN: 1 / probability,
    };
  }

  // Recommend the smallest non-negative drift step count that still covers the
  // expected one-sided clock skew. ceil(skew / period). Zero skew, zero drift.
  function recommendedDriftForSkew(opts) {
    var skew = Math.abs(Number(opts.skew));
    var period = Number(opts.period);
    if (!Number.isFinite(skew) || skew <= 0) return 0;
    if (!Number.isFinite(period) || period <= 0) return 0;
    return Math.ceil(skew / period);
  }

  function assertValid(input) {
    var period = Number(input.period);
    if (!Number.isFinite(period) || period <= 0) {
      throw new Error('Period must be a positive number of seconds.');
    }
    var digits = Number(input.digits);
    if (DIGIT_OPTIONS.indexOf(digits) === -1) {
      throw new Error('Digits must be 6, 7 or 8.');
    }
    var drift = Number(input.drift);
    if (!Number.isFinite(drift) || drift < 0) {
      throw new Error('Drift window must be zero or positive.');
    }
    if (ALGOS.indexOf(String(input.algo).toUpperCase()) === -1) {
      throw new Error('Algorithm must be one of SHA1, SHA256, SHA512.');
    }
    var skew = Number(input.skew);
    if (!Number.isFinite(skew)) {
      throw new Error('Clock skew must be a number.');
    }
  }

  // Attempts per second to reach a 50% chance of at least one accepted guess
  // inside one period. From the geometric distribution:
  //   N attempts give 1 - (1 - p)^N >= 0.5, so N = ln(0.5) / ln(1 - p).
  // Per-second rate is N / period.
  function attemptsPerSecondFor50pc(probability, period) {
    if (probability <= 0 || probability >= 1) return Infinity;
    var n = Math.log(0.5) / Math.log(1 - probability);
    return n / period;
  }

  function assessTotp(input) {
    assertValid(input);

    var period = Number(input.period);
    var digits = Number(input.digits);
    var drift = Number(input.drift);
    var skew = Number(input.skew);
    var algo = String(input.algo).toUpperCase();

    var windowSeconds = acceptanceWindowSeconds({ period: period, drift: drift });
    var space = guessSpace({ digits: digits, drift: drift });
    var attemptsPerSec = attemptsPerSecondFor50pc(space.probability, period);
    var recommendedDrift = recommendedDriftForSkew({ skew: skew, period: period });

    // Anything past 90 seconds of acceptance window is worth flagging. RFC 6238
    // recommends keeping the validation window narrow, with a +/- 1 step max.
    var tooWide = windowSeconds > 90;

    return {
      windowSeconds: windowSeconds,
      probability: space.probability,
      oneInN: space.oneInN,
      acceptedCodes: space.acceptedCodes,
      codeSpace: space.codeSpace,
      attemptsPerSecondFor50pc: attemptsPerSec,
      recommendedDrift: recommendedDrift,
      tooWide: tooWide,
      period: period,
      digits: digits,
      drift: drift,
      skew: skew,
      algo: algo,
    };
  }

  return {
    assessTotp: assessTotp,
    acceptanceWindowSeconds: acceptanceWindowSeconds,
    guessSpace: guessSpace,
    recommendedDriftForSkew: recommendedDriftForSkew,
    attemptsPerSecondFor50pc: attemptsPerSecondFor50pc,
    ALGOS: ALGOS,
    DIGIT_OPTIONS: DIGIT_OPTIONS,
  };
}));
