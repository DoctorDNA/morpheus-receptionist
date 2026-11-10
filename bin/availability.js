#!/usr/bin/env node
// Shows each appointment type with its next open day and times.
//   node bin/availability.js            all appointment types
//   node bin/availability.js wellness   only types whose name contains "wellness"
import { listServices, nextAvailable, speakDate, speakTime } from '../src/godaddy.js';

const filter = (process.argv[2] || '').toLowerCase();
const services = (await listServices()).filter((s) => s.name.toLowerCase().includes(filter));
if (!services.length) {
  console.error(`No appointment type matches "${filter}".`);
  process.exit(1);
}
for (const s of services) {
  console.log(`\n${s.name}  (${s.minutes} min, ${s.price})`);
  const next = await nextAvailable(s);
  if (!next) console.log('  No openings in the next 30 days.');
  else console.log(`  Next open day: ${speakDate(next.date)}\n  Times: ${next.times.map(speakTime).join(', ')}`);
}
