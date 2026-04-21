'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WebHostingEstimator = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  function estimateHosting(opts) {
    var monthlyVisitors   = opts.monthlyVisitors;
    var pagesPerVisit     = opts.pagesPerVisit;
    var pageWeightKB      = opts.pageWeightKB;
    var mediaFiles        = opts.mediaFiles        || 0;
    var mediaFileSizeKB   = opts.mediaFileSizeKB   || 0;
    var downloadFiles     = opts.downloadFiles     || 0;
    var downloadFileSizeMB = opts.downloadFileSizeMB || 0;
    var monthlyDownloads  = opts.monthlyDownloads  || 0;
    var bufferPercent     = opts.bufferPercent      != null ? opts.bufferPercent : 0;

    if (!monthlyVisitors || monthlyVisitors <= 0) throw new Error('monthlyVisitors must be > 0');
    if (!pagesPerVisit   || pagesPerVisit   <= 0) throw new Error('pagesPerVisit must be > 0');
    if (!pageWeightKB    || pageWeightKB    <= 0) throw new Error('pageWeightKB must be > 0');
    if (bufferPercent < 0)                        throw new Error('bufferPercent must be >= 0');

    var monthlyPageviews = monthlyVisitors * pagesPerVisit;

    var pageBandwidthGB     = monthlyVisitors * pagesPerVisit * pageWeightKB / 1e6;
    var downloadBandwidthGB = monthlyDownloads * downloadFileSizeMB / 1000;
    var totalBandwidthRawGB = pageBandwidthGB + downloadBandwidthGB;
    var totalBandwidthWithBufferGB = totalBandwidthRawGB * (1 + bufferPercent / 100);

    var mediaStorageGB    = mediaFiles * mediaFileSizeKB / 1e6;
    var downloadStorageGB = downloadFiles * downloadFileSizeMB / 1000;
    var totalStorageRawGB = mediaStorageGB + downloadStorageGB;
    var totalStorageWithBufferGB = totalStorageRawGB * (1 + bufferPercent / 100);

    var tier;
    if (totalBandwidthWithBufferGB > 1000 || totalStorageWithBufferGB > 100) {
      tier = 'dedicated';
    } else if (totalBandwidthWithBufferGB > 100 || totalStorageWithBufferGB > 5) {
      tier = 'vps';
    } else {
      tier = 'shared';
    }

    return {
      monthlyPageviews:            monthlyPageviews,
      pageBandwidthGB:             pageBandwidthGB,
      downloadBandwidthGB:         downloadBandwidthGB,
      totalBandwidthRawGB:         totalBandwidthRawGB,
      totalBandwidthWithBufferGB:  totalBandwidthWithBufferGB,
      mediaStorageGB:              mediaStorageGB,
      downloadStorageGB:           downloadStorageGB,
      totalStorageRawGB:           totalStorageRawGB,
      totalStorageWithBufferGB:    totalStorageWithBufferGB,
      tier:                        tier,
    };
  }

  return { estimateHosting: estimateHosting };
}));
