'use strict';

// Common race distances in metres
var RACE_DISTANCES = {
  '5k':         { label: '5K',           metres: 5000 },
  '10k':        { label: '10K',          metres: 10000 },
  'half':       { label: 'Half Marathon', metres: 21097.5 },
  'marathon':   { label: 'Marathon',     metres: 42195 },
};

/**
 * Parse a time string "H:MM:SS" or "MM:SS" into total seconds.
 * Returns NaN if the format is invalid.
 */
function parseTime(str) {
  if (typeof str !== 'string') return NaN;
  var parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

/**
 * Format total seconds as "H:MM:SS" or "M:SS" if < 1 hour.
 */
function formatTime(seconds) {
  var s = Math.round(seconds);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  if (h > 0) {
    return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  return m + ':' + String(sec).padStart(2, '0');
}

/**
 * Format a pace in seconds/km as "M:SS /km".
 */
function formatPace(secsPerKm) {
  var m   = Math.floor(secsPerKm / 60);
  var sec = Math.round(secsPerKm % 60);
  if (sec === 60) { m++; sec = 0; }
  return m + ':' + String(sec).padStart(2, '0');
}

/**
 * Calculate any one of {pace, distance, time} from the other two.
 *
 * Inputs — provide exactly two of:
 * @param {number|null} opts.paceSecsPerKm  - Pace in seconds per km
 * @param {number|null} opts.distanceKm     - Distance in kilometres
 * @param {number|null} opts.timeSecs       - Total time in seconds
 *
 * All three may be provided; if so, pace is recalculated from time and distance.
 */
function calculateRunningPace({ paceSecsPerKm, distanceKm, timeSecs }) {
  var hasPace     = paceSecsPerKm != null && !isNaN(paceSecsPerKm);
  var hasDistance = distanceKm    != null && !isNaN(distanceKm);
  var hasTime     = timeSecs      != null && !isNaN(timeSecs);

  // Validate provided values
  if (hasPace     && paceSecsPerKm <= 0)  throw new Error('pace must be positive');
  if (hasDistance && distanceKm <= 0)     throw new Error('distance must be positive');
  if (hasTime     && timeSecs <= 0)       throw new Error('time must be positive');

  var pace, distance, time;

  if (hasDistance && hasTime) {
    // Calculate pace from distance and time
    distance = distanceKm;
    time     = timeSecs;
    pace     = time / distance;
  } else if (hasPace && hasTime) {
    // Calculate distance from pace and time
    pace     = paceSecsPerKm;
    time     = timeSecs;
    distance = time / pace;
  } else if (hasPace && hasDistance) {
    // Calculate time from pace and distance
    pace     = paceSecsPerKm;
    distance = distanceKm;
    time     = pace * distance;
  } else {
    throw new Error('Provide exactly two of: pace, distance, time');
  }

  // Pace per mile (1 mile = 1.60934 km)
  var pacePerMile = pace * 1.60934;
  // Speed in km/h
  var speedKmh = 3600 / pace;
  // Speed in mph
  var speedMph = speedKmh / 1.60934;

  // Race time predictions based on calculated pace
  var predictions = {};
  Object.keys(RACE_DISTANCES).forEach(function (key) {
    var d = RACE_DISTANCES[key];
    var distKm   = d.metres / 1000;
    var raceSecs = pace * distKm;
    predictions[key] = {
      label:   d.label,
      metres:  d.metres,
      distKm:  Math.round(distKm * 100) / 100,
      timeSecs: Math.round(raceSecs),
      timeFormatted: formatTime(raceSecs),
    };
  });

  return {
    paceSecsPerKm:  Math.round(pace * 10) / 10,
    distanceKm:     Math.round(distance * 1000) / 1000,
    timeSecs:       Math.round(time),
    paceFormatted:      formatPace(pace),       // "M:SS /km"
    pacePerMileFormatted: formatPace(pacePerMile), // "M:SS /mi"
    timeFormatted:      formatTime(time),
    speedKmh:       Math.round(speedKmh * 100) / 100,
    speedMph:       Math.round(speedMph * 100) / 100,
    predictions,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateRunningPace, parseTime, formatTime, formatPace, RACE_DISTANCES };
} else {
  window.RunningPace = { calculateRunningPace, parseTime, formatTime, formatPace, RACE_DISTANCES };
}
