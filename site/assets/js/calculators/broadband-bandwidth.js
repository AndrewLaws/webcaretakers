(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BroadbandBandwidth = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  var STREAMING_MBPS = { none: 0, sd: 3, hd: 5, '4k': 25 };
  var VIDEO_CALL_DOWN = { none: 0, occasional: 2, daily: 4 };
  var VIDEO_CALL_UP = { none: 0, occasional: 2, daily: 4 };
  var GAMING_DOWN = 6;
  var GAMING_UP = 1;
  var SMART_DEVICE_DOWN = 1;
  var SMART_DEVICE_UP = 0.5;
  var WFH_DOWN = 10;
  var WFH_UP = 5;
  var HEADROOM = 1.2;

  function roundUpTo(n, step) {
    return Math.ceil(n / step) * step;
  }

  function tierFor(downloadMbps) {
    if (downloadMbps <= 25) return 'Entry-level broadband';
    if (downloadMbps <= 100) return 'Standard broadband';
    if (downloadMbps <= 200) return 'Fast fibre';
    return 'Full fibre / Ultrafast';
  }

  function calculateBandwidth(input) {
    var users = Number(input.users);
    if (!Number.isFinite(users) || users < 1) {
      throw new Error('users must be at least 1');
    }
    if (!(input.streaming in STREAMING_MBPS)) {
      throw new Error('invalid streaming quality: ' + input.streaming);
    }
    if (!(input.videoCalls in VIDEO_CALL_DOWN)) {
      throw new Error('invalid videoCalls value: ' + input.videoCalls);
    }
    var smartDevices = Math.max(0, Number(input.smartDevices) || 0);
    var gaming = !!input.gaming;
    var wfh = !!input.workFromHome;

    var rawDown =
      STREAMING_MBPS[input.streaming] * users +
      VIDEO_CALL_DOWN[input.videoCalls] * users +
      (gaming ? GAMING_DOWN : 0) +
      SMART_DEVICE_DOWN * smartDevices +
      (wfh ? WFH_DOWN : 0);

    var rawUp =
      VIDEO_CALL_UP[input.videoCalls] * users +
      (gaming ? GAMING_UP : 0) +
      SMART_DEVICE_UP * smartDevices +
      (wfh ? WFH_UP : 0);

    var downloadMbps = Math.max(5, roundUpTo(rawDown * HEADROOM, 5));
    var uploadMbps = Math.ceil(rawUp * HEADROOM);

    return {
      downloadMbps: downloadMbps,
      uploadMbps: uploadMbps,
      tier: tierFor(downloadMbps),
      breakdown: {
        streamingDown: STREAMING_MBPS[input.streaming] * users,
        videoCallDown: VIDEO_CALL_DOWN[input.videoCalls] * users,
        videoCallUp: VIDEO_CALL_UP[input.videoCalls] * users,
        gamingDown: gaming ? GAMING_DOWN : 0,
        gamingUp: gaming ? GAMING_UP : 0,
        smartDevicesDown: SMART_DEVICE_DOWN * smartDevices,
        smartDevicesUp: SMART_DEVICE_UP * smartDevices,
        workFromHomeDown: wfh ? WFH_DOWN : 0,
        workFromHomeUp: wfh ? WFH_UP : 0,
        headroomMultiplier: HEADROOM,
      },
    };
  }

  return { calculateBandwidth: calculateBandwidth };
}));
