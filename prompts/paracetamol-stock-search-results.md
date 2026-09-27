# Demo Medication Stock Across Clinics

## Objective

For local demonstration, show medication availability across all clinics using deterministic dummy stock data. Include both Low Stock and In Stock clinics and show every clinic with positive sample stock. Never show numeric quantities to public users. Clearly label all sample availability as demo data so it cannot be mistaken for live clinic inventory.

## Current evidence

- The live database contains 13 clinics but currently has only one clinic-specific medication stock row for each default medication.
- The public renderer lists every positive `availableAt` entry and currently hides unit counts.
- The client fetches clinic and medication data from `GET /api/public-data` at the configured API address.
- The user explicitly requested temporary dummy data to demonstrate other clinic results.

## Requirements

1. Add a deterministic server-side demo stock fixture that gives every clinic sample medication records with both Low Stock and In Stock statuses, including Paracetamol.
2. Enable the fixture only through an explicit `DEMO_STOCK_DATA=true` setting in non-production. Refuse or ignore this setting in production.
3. Compose demo rows into the public API response only; never persist them to PostgreSQL or overwrite actual staff-reported clinic quantities. Preserve actual rows where present and generate samples only for missing clinic-medication pairs.
4. Set derived availability on the server from sample numeric quantities using the existing thresholds. Keep quantities available to server-side logic but never display them in public search results.
5. Include an explicit API demo-mode indicator and show a clear `DEMO DATA - NOT LIVE INVENTORY` notice in the public medication search whenever sample rows are enabled.
6. Keep the no-reporting and recoverable API error states correct when demo mode is disabled. Preserve normal production behavior and existing public-data shape apart from the demo indicator.
7. Keep existing medication search behavior and other medication views working. Avoid unrelated queue, clinic, authentication, or stock-threshold changes.

## Acceptance checks

- With demo mode enabled in development, every clinic appears for Paracetamol with sample Low Stock or In Stock labels, and the public UI shows the demo notice but no numeric quantities.
- Demo data is not written to or substituted for existing PostgreSQL clinic stock rows.
- With demo mode disabled, only actual positive clinic stock reports appear; an empty set shows the no-reporting state.
- Demo mode cannot be enabled in production.
- An unavailable API shows a recoverable error state and does not imply that no clinics report stock.
- Run focused server tests, client lint, and client production build; verify demo and non-demo behavior in the browser.
