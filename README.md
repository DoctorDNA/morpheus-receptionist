# Morpheus Receptionist

An AI phone receptionist for Morpheus Precision Health: it answers calls, offers
the clinic's appointment types, finds open times, collects the caller's details,
and logs every call to a private dashboard.

## Status

| Step | State |
| --- | --- |
| 1. Read appointment types and open times from the GoDaddy booking system | Working |
| 2. Submit a booking | Not tested yet (needs a real test appointment) |
| 3. Talk to it on a computer | Not started |
| 4. Phone line | Not started |
| 5. Call log and dashboard | Not started |

## What works today

`src/godaddy.js` reads live data from the same public service the website's
Book Now page uses. No password is involved and nothing is changed on the
calendar.

```bash
node bin/availability.js
```

prints each appointment type with its next open day and times. Add a word to
narrow it, for example `node bin/availability.js wellness`.

```bash
npm test
```

runs the checks for time-zone and price handling.

Requires Node.js 20 or newer. No other installs.

## How booking was found to work

The Book Now page loads services, open dates and open times from
`api.ola.godaddy.com` as plain data, so reading availability does not depend on
clicking through the page. The final "book it" step runs through GoDaddy's
checkout (`cart-checkout.secureserver.net`) and has not been exercised yet.

## Privacy

Caller names, phone numbers, emails and appointment types are patient
information. Never commit call logs, recordings or `.env` files; `data/` and
`.env` are ignored by git.
