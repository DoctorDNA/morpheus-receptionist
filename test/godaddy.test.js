import test from 'node:test';
import assert from 'node:assert/strict';
import { priceText, durationMinutes, zonedInstant, localDate, speakDate, speakTime } from '../src/godaddy.js';

test('prices read the way the booking page shows them', () => {
  assert.equal(priceText({ cost_type: 'free', cost: '0.0' }), 'Free');
  assert.equal(priceText({ cost_type: 'cost', cost: '99.0' }), '$99');
  assert.equal(priceText({ cost_type: 'cost', cost: '99.5' }), '$99.50');
  assert.equal(
    priceText({ cost_type: 'custom_text', cost: '0.0', custom_cost_text: '$99 or Membership' }),
    '$99 or Membership',
  );
});

test('durations', () => {
  assert.equal(durationMinutes('PT50M'), 50);
  assert.equal(durationMinutes('PT1H'), 60);
  assert.equal(durationMinutes('PT1H30M'), 90);
});

test('clinic-local time conversion, standard and daylight time', () => {
  assert.equal(zonedInstant('2026-11-12', '09:00:00.000').toISOString(), '2026-11-12T15:00:00.000Z');
  assert.equal(zonedInstant('2026-07-01', '09:00:00.000').toISOString(), '2026-07-01T14:00:00.000Z');
  assert.equal(zonedInstant('2026-11-12', '23:59:59.999').toISOString(), '2026-11-13T05:59:59.999Z');
});

test('late-evening UTC still falls on the right clinic day', () => {
  assert.equal(localDate(new Date('2026-11-13T03:00:00Z')), '2026-11-12');
});

test('spoken formats', () => {
  assert.equal(speakDate('2026-11-12'), 'Thursday, November 12');
  assert.equal(speakTime(new Date('2026-11-12T15:30:00Z')), '9:30 AM');
});
