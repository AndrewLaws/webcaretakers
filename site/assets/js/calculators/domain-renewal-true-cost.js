'use strict';

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Calculate the true multi-year cost of a domain including renewal price hikes
 * and optional add-ons (WHOIS privacy, email, DNS, SSL).
 *
 * opts:
 *   firstYearPrice          number  promo first-year domain price
 *   renewalPrice            number  standard annual renewal price
 *   years                   number  projection length, >= 1 (default 5)
 *   privacyAnnual           number  WHOIS privacy annual cost (default 0)
 *   emailMonthlyPerMailbox  number  professional email monthly cost per mailbox (default 0)
 *   mailboxes               number  number of mailboxes (default 0)
 *   dnsAnnual               number  managed DNS annual cost (default 0)
 *   sslAnnual               number  SSL certificate annual cost (default 0)
 *   alternativeAnnual       number  alternative registrar flat annual price (optional)
 */
function calculateCost(opts) {
  var firstYear = opts.firstYearPrice;
  var renewal   = opts.renewalPrice;
  var years     = opts.years == null ? 5 : opts.years;
  var privacy   = opts.privacyAnnual == null ? 0 : opts.privacyAnnual;
  var emailPer  = opts.emailMonthlyPerMailbox == null ? 0 : opts.emailMonthlyPerMailbox;
  var mailboxes = opts.mailboxes == null ? 0 : opts.mailboxes;
  var dns       = opts.dnsAnnual == null ? 0 : opts.dnsAnnual;
  var ssl       = opts.sslAnnual == null ? 0 : opts.sslAnnual;
  var altAnnual = opts.alternativeAnnual;

  if (typeof firstYear !== 'number' || firstYear < 0) throw new Error('firstYearPrice must be zero or positive');
  if (typeof renewal !== 'number' || renewal < 0) throw new Error('renewalPrice must be zero or positive');
  if (typeof years !== 'number' || years < 1 || !Number.isFinite(years)) throw new Error('years must be at least 1');
  if (privacy < 0 || emailPer < 0 || mailboxes < 0 || dns < 0 || ssl < 0) throw new Error('add-on costs must be zero or positive');

  var addonsAnnual = privacy + (emailPer * 12 * mailboxes) + dns + ssl;
  var yearBreakdown = [];
  var totalDomain = 0;
  var totalAddons = 0;

  for (var y = 1; y <= years; y++) {
    var domainCost = (y === 1) ? firstYear : renewal;
    totalDomain += domainCost;
    totalAddons += addonsAnnual;
    yearBreakdown.push({
      year: y,
      domain: round2(domainCost),
      addons: round2(addonsAnnual),
      total: round2(domainCost + addonsAnnual),
    });
  }

  var totalNYear = totalDomain + totalAddons;
  var avgAnnual = totalNYear / years;
  var effectiveMonthly = avgAnnual / 12;
  var firstYearDiscount = renewal - firstYear;

  var result = {
    years: years,
    addonsAnnual: round2(addonsAnnual),
    yearBreakdown: yearBreakdown,
    totalDomain: round2(totalDomain),
    totalAddons: round2(totalAddons),
    totalNYear: round2(totalNYear),
    avgAnnual: round2(avgAnnual),
    effectiveMonthly: round2(effectiveMonthly),
    firstYearDiscount: round2(firstYearDiscount),
  };

  if (typeof altAnnual === 'number' && altAnnual >= 0) {
    var altTotal = (altAnnual + addonsAnnual) * years;
    result.alternativeAnnual = round2(altAnnual);
    result.alternativeNYearTotal = round2(altTotal);
    result.savingsIfSwitched = round2(totalNYear - altTotal);
  }

  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { calculateCost: calculateCost };
else window.DomainRenewalTrueCost = { calculateCost: calculateCost };
