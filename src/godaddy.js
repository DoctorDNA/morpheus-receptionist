// Reads appointment types and open times from the clinic's public GoDaddy
// Online Appointments service -- the same one the "Book Now" page calls.
// Read-only: nothing here creates or changes a booking.

const API = process.env.OLA_API_BASE || 'https://api.ola.godaddy.com';
// Public account id, visible in the Book Now page source.
const ACCOUNT = process.env.OLA_ACCOUNT_ID || '77f5b68b-801c-4ddf-b4c9-9486563dff26';
export const TIME_ZONE = process.env.CLINIC_TIME_ZONE || 'America/Chicago';

async function get(path, params = {}, { retries = 3 } = {}) {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) {
    for (const item of [].concat(v)) url.searchParams.append(k, item);
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
      lastErr = new Error(`GoDaddy appointments service answered ${res.status} for ${url.pathname}`);
      if (res.status < 500 && res.status !== 429) break; // our mistake; retrying won't help
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  throw lastErr;
}

/** "PT50M" / "PT1H" / "PT1H30M" -> minutes */
export function durationMinutes(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso || '');
  if (!m) return null;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}

/** Price as the Book Now page words it: "Free", "$99", or the clinic's own text. */
export function priceText(s) {
  if (s.cost_type === 'custom_text' && s.custom_cost_text) return s.custom_cost_text;
  const n = Number(s.cost);
  if (s.cost_type === 'free' || !n) return 'Free';
  return '$' + (Number.isInteger(n) ? n : n.toFixed(2));
}

/** The appointment types offered on the Book Now page. */
export async function listServices() {
  const data = await get(`/v3/accounts/${ACCOUNT}/services`, { per_page: 80 });
  return data.results.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    minutes: durationMinutes(s.duration),
    price: priceText(s),
    resourceIds: (s.resources || []).map((r) => r.id),
  }));
}

// Clinic-local calendar date ("2026-11-12") for an instant.
export function localDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

// The instant at which the given clinic-local wall-clock time occurs.
export function zonedInstant(ymd, hms = '00:00:00.000') {
  const guess = new Date(`${ymd}T${hms}Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(guess).map((p) => [p.type, p.value]),
  );
  const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offset = shown - Math.floor(guess.getTime() / 1000) * 1000;
  return new Date(guess.getTime() - offset);
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Days with at least one opening, as clinic-local dates, soonest first.
 * Looks from now through `days` days ahead.
 */
export async function availableDates(service, { days = 30, now = new Date() } = {}) {
  const end = zonedInstant(addDays(localDate(now), days), '23:59:59.999');
  const data = await get(`/accounts/${ACCOUNT}/services/${service.id}/available_dates`, {
    start_time: now.toISOString(),
    end_time: end.toISOString(),
    'resource_ids[]': service.resourceIds,
  });
  return [...new Set((data.available_dates || []).map((d) => localDate(new Date(d))))].sort();
}

/** Open start times on one clinic-local date, soonest first. Past times are left out. */
export async function availableTimes(service, ymd, { now = new Date() } = {}) {
  const dayStart = zonedInstant(ymd, '00:00:00.000');
  const start = dayStart > now ? dayStart : now;
  const end = zonedInstant(ymd, '23:59:59.999');
  if (end <= start) return [];
  const data = await get(`/v2/accounts/${ACCOUNT}/services/${service.id}/available_times`, {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    'resource_ids[]': service.resourceIds,
  });
  return Object.keys(data.available_times || {})
    .map((t) => new Date(t))
    .filter((t) => t > now)
    .sort((a, b) => a - b);
}

/** The first day with openings and its times, or null if nothing is open in the window. */
export async function nextAvailable(service, opts = {}) {
  for (const ymd of await availableDates(service, opts)) {
    const times = await availableTimes(service, ymd, opts);
    if (times.length) return { date: ymd, times };
  }
  return null;
}

/** "Thursday, November 12" */
export function speakDate(ymd) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date(`${ymd}T12:00:00Z`));
}

/** "9:30 AM" in clinic time */
export function speakTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit',
  }).format(date);
}
