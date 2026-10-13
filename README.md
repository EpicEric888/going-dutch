# Going Dutch

Group bill splitter: upload a receipt, friends claim what they ordered, everyone sees what they owe with tax, fees and tip split fairly.

## Status
- [x] Supabase project `going-dutch` (us-west-1)
- [x] Database: bills, bill_members, claims, profiles, with row level security
- [ ] Turn on anonymous sign-ins in Supabase (so friends can join from a link without an account)
- [x] Web app (plain HTML + JavaScript, no build step), ported from `going-dutch-prototype.html`
- [x] Guest links, "My bills" page, email sign-in (magic link), live claiming
- [ ] Google sign-in
- [ ] Receipt reading (Supabase Edge Function, Meta Muse Spark API)
- [ ] Hosting (Vercel or Netlify)

## Supabase
- Project URL: https://mdhpsnfqmokhpctirhnl.supabase.co
- Publishable key (safe to ship in the browser): sb_publishable_euShG7YYAEwuHdlQxZfAdA_SY4Nz5Zx
- Dashboard: https://supabase.com/dashboard/project/mdhpsnfqmokhpctirhnl

## How access works
- Every visitor is signed in, either anonymously (guest) or with a real account.
- Opening a bill link calls `join_bill(share_code)`, which adds you to that bill.
- You can only read or change bills you have joined. A guest can upgrade to a real account later and keep their bills.

## Data model
- `bills`: receipt (merchant, date, items, tax, fees), tip, participants (JSON), share_code
- `bill_members`: which accounts can open which bill
- `claims`: one row per (bill, person, item)
- `profiles`: display name per account

## Files
- `index.html`: the page; loads React, Tailwind and Supabase from public CDNs
- `js/config.js`: Supabase URL and publishable key
- `js/core.js`: helpers, themes, the split math, example bill
- `js/ui.js`: the screens (upload, people, receipt editor, claiming, summary)
- `js/data.js`: sign-in, creating and listing bills, live sync
- `js/pages.js`: account menu, My bills, the bill page
- `js/app.js`: routing (`#/` home, `#/b/<code>` a bill) and the app shell

## Running it
It needs to be served over http(s), not opened as a file. Any static host works
(GitHub Pages, Netlify, Vercel). Locally: `python3 -m http.server 8000` in this folder,
then open http://localhost:8000.

## Supabase settings to set by hand
- Authentication: allow anonymous sign-ins
- Authentication > URL configuration: set Site URL to where the site is hosted, and add it to Redirect URLs (needed for email sign-in links)
