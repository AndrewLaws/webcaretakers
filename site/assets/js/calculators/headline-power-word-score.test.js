const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreHeadline } = require('./headline-power-word-score.js');

test('empty headline returns zero score and Weak label', () => {
  const r = scoreHeadline({ headline: '', audience: 'general' });
  assert.equal(r.score, 0);
  assert.equal(r.label, 'Weak');
  assert.equal(r.wordCount, 0);
});

test('whitespace-only headline scores zero', () => {
  const r = scoreHeadline({ headline: '   ', audience: 'general' });
  assert.equal(r.score, 0);
  assert.equal(r.wordCount, 0);
});

test('strong listicle headline scores in the Strong band or higher', () => {
  // 7 words, has a number, has urgency + value power words, positive sentiment.
  const r = scoreHeadline({
    headline: '7 Proven Secrets to Win Today',
    audience: 'general'
  });
  assert.ok(r.score >= 60, 'expected score >= 60, got ' + r.score);
  assert.ok(['Strong', 'Killer'].includes(r.label));
  assert.equal(r.hasNumber, true);
  assert.ok(r.powerWords.value.includes('proven'));
  assert.ok(r.powerWords.curiosity.includes('secret'));
});

test('flavourless neutral headline scores lower than emotive equivalent', () => {
  const flat = scoreHeadline({
    headline: 'Some thoughts on the use of items in the office',
    audience: 'general'
  });
  const sharp = scoreHeadline({
    headline: '7 Shocking Mistakes That Ruin Your Office',
    audience: 'general'
  });
  assert.ok(sharp.score > flat.score, 'sharp ' + sharp.score + ' should beat flat ' + flat.score);
});

test('how-to framing gets the format bonus', () => {
  const r = scoreHeadline({
    headline: 'How to Write Better Headlines in Minutes',
    audience: 'general'
  });
  assert.equal(r.isHowTo, true);
  assert.ok(r.components.format > 0);
});

test('question framing gets a format bonus', () => {
  const r = scoreHeadline({
    headline: 'Why does your headline feel flat?',
    audience: 'general'
  });
  assert.equal(r.hasQuestion, true);
  assert.ok(r.components.format > 0);
});

test('overlong headline (>12 words) is penalised on length', () => {
  const long = scoreHeadline({
    headline: 'This is a very long headline that goes on for far too many words to be useful',
    audience: 'general'
  });
  const tight = scoreHeadline({
    headline: 'This is a tight headline that fits the band',
    audience: 'general'
  });
  assert.ok(long.components.length < tight.components.length);
});

test('a digit anywhere triggers the number bonus', () => {
  const withN = scoreHeadline({ headline: 'Save 50% on your next backup', audience: 'general' });
  const withoutN = scoreHeadline({ headline: 'Save loads on your next backup', audience: 'general' });
  assert.equal(withN.hasNumber, true);
  assert.equal(withoutN.hasNumber, false);
  assert.ok(withN.components.number > withoutN.components.number);
});

test('high stop-word ratio drags the common-word component down', () => {
  const filler = scoreHeadline({
    headline: 'It is a thing of the and in the at on for',
    audience: 'general'
  });
  assert.ok(filler.commonWordRatio > 0.5);
  assert.equal(filler.components.common, 0);
});

test('audience weighting: consumer scores power words higher than B2B', () => {
  const consumer = scoreHeadline({ headline: 'Shocking Free Secret Mistake', audience: 'consumer' });
  const b2b = scoreHeadline({ headline: 'Shocking Free Secret Mistake', audience: 'B2B' });
  assert.ok(consumer.components.power > b2b.components.power);
});

test('power-word categorisation returns the matched words by category', () => {
  const r = scoreHeadline({
    headline: 'Discover the proven secret to instant success',
    audience: 'general'
  });
  assert.ok(r.powerWords.curiosity.includes('discover'));
  assert.ok(r.powerWords.curiosity.includes('secret'));
  assert.ok(r.powerWords.value.includes('proven'));
  assert.ok(r.powerWords.urgency.includes('instant'));
  assert.equal(typeof r.powerWords.total, 'number');
  assert.ok(r.powerWords.total >= 4);
});

test('suggestion list flags missing number when none present', () => {
  const r = scoreHeadline({ headline: 'How to write a better headline', audience: 'general' });
  const joined = r.suggestions.join(' ').toLowerCase();
  assert.ok(joined.includes('number'));
});

test('suggestion list flags neutral sentiment', () => {
  const r = scoreHeadline({ headline: 'Some notes on items in the office', audience: 'general' });
  assert.equal(r.sentiment, 'neutral');
  const joined = r.suggestions.join(' ').toLowerCase();
  assert.ok(joined.includes('sentiment') || joined.includes('neutral'));
});

test('label boundaries: Killer (>=80), Strong (>=60), Average (>=40), Weak (<40)', () => {
  // Killer: stack everything that scores.
  const killer = scoreHeadline({
    headline: 'How to Win 7 Shocking Free Proven Secrets Today',
    audience: 'consumer'
  });
  assert.ok(['Strong', 'Killer'].includes(killer.label));

  const weak = scoreHeadline({ headline: 'A note', audience: 'general' });
  assert.equal(weak.label, 'Weak');
});

test('score is always clamped between 0 and 100', () => {
  const r = scoreHeadline({
    headline: 'How to Win 7 Shocking Free Proven Secret Instant Easy Powerful Today Discover Mistake',
    audience: 'consumer'
  });
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('unknown audience falls back to general', () => {
  const r = scoreHeadline({ headline: 'Something normal here', audience: 'martian' });
  assert.equal(r.audience, 'general');
});
