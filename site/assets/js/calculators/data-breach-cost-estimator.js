(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DataBreachCostEstimator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Per-record cost figures from the IBM/Ponemon "Cost of a Data Breach 2024" report.
  // Numbers are USD per record, averaged across the sectors IBM reports on.
  var SECTORS = [
    { slug: 'healthcare', name: 'Healthcare',     perRecord: 408 },
    { slug: 'financial',  name: 'Financial',      perRecord: 295 },
    { slug: 'tech',       name: 'Technology',     perRecord: 244 },
    { slug: 'services',   name: 'Services',       perRecord: 215 },
    { slug: 'retail',     name: 'Retail',         perRecord: 172 },
    { slug: 'public',     name: 'Public sector',  perRecord: 156 },
    { slug: 'other',      name: 'Other',          perRecord: 200 }
  ];

  // Region multipliers reflect the rough cost-of-breach gap IBM reports between
  // US-headquartered breaches and the rest of the world.
  var REGIONS = [
    { slug: 'us',    name: 'United States',  multiplier: 1.0  },
    { slug: 'eu',    name: 'European Union', multiplier: 0.85 },
    { slug: 'uk',    name: 'United Kingdom', multiplier: 0.92 },
    { slug: 'other', name: 'Other / global', multiplier: 0.7  }
  ];

  // Sensitivity multipliers reflect how much more expensive certain categories
  // of data tend to be once you factor in notification, credit monitoring,
  // legal action and reputational fallout.
  var SENSITIVITY = [
    { slug: 'pii',         name: 'PII only',                multiplier: 1.0 },
    { slug: 'financial',   name: 'Financial data + PII',    multiplier: 1.2 },
    { slug: 'health',      name: 'Health data + PII',       multiplier: 1.4 },
    { slug: 'credentials', name: 'Credentials (passwords)', multiplier: 1.1 }
  ];

  var REGULATORY = [
    { slug: 'none', name: 'None / not applicable' },
    { slug: 'gdpr', name: 'GDPR (4% of global revenue)' },
    { slug: 'ccpa', name: 'CCPA ($7,500 per record cap)' }
  ];

  function findOrThrow(list, slug, label) {
    var item = list.find(function (x) { return x.slug === slug; });
    if (!item) throw new Error('Unknown ' + label + ': ' + slug);
    return item;
  }

  function estimateBreachCost(input) {
    var records = Number(input.records);
    var revenue = Number(input.revenue) || 0;
    if (!Number.isFinite(records) || records < 0) {
      throw new Error('records must be a non-negative number');
    }
    var sector = findOrThrow(SECTORS, input.sector, 'sector');
    var region = findOrThrow(REGIONS, input.region, 'region');
    var sens   = findOrThrow(SENSITIVITY, input.sensitivity, 'sensitivity');
    var reg    = findOrThrow(REGULATORY, input.regulatory, 'regulatory regime');

    var perRecord = sector.perRecord * region.multiplier * sens.multiplier;
    var directCost = records * perRecord;
    if (input.reported72h) directCost = directCost * 0.9;

    var regulatoryFine = 0;
    if (reg.slug === 'gdpr') {
      // 4% of global annual revenue is the headline GDPR cap. Real fines are
      // often lower; this is the worst-case ceiling for planning purposes.
      regulatoryFine = revenue * 0.04;
    } else if (reg.slug === 'ccpa') {
      // CCPA statutory damages are up to $7,500 per intentional violation per
      // record. We use the cap as the planning figure.
      regulatoryFine = records * 7500;
    }

    var total = directCost + regulatoryFine;
    var low = total * 0.7;
    var high = total * 1.3;

    return {
      records: records,
      sector: sector,
      region: region,
      sensitivity: sens,
      regulatory: reg,
      revenue: revenue,
      reported72h: !!input.reported72h,
      perRecord: perRecord,
      directCost: directCost,
      regulatoryFine: regulatoryFine,
      total: total,
      low: low,
      high: high
    };
  }

  return {
    estimateBreachCost: estimateBreachCost,
    SECTORS: SECTORS,
    REGIONS: REGIONS,
    SENSITIVITY: SENSITIVITY,
    REGULATORY: REGULATORY
  };
}));
