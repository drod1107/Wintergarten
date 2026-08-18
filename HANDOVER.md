# Handover — five things you'll do yourself

These all happen at `/admin` (see SETUP.md to set your password first). Log
in from a phone browser just like any website — no app to install. Every
save on this page takes effect immediately; there's no publish step.

## 1. Open or close the order window

Go to `/admin/dashboard`, first section, **Order window**.

- Pick **Open**, **Closed**, or **Scheduled**.
- If you want it to close itself at a specific time, set **Closes at** — the
  homepage stamp and the order page both switch to "closed" automatically
  the moment that time passes, even if you never come back to flip it.
- **Pickup days** and the **notes shown when closed** are plain text you can
  reword any time — that's what customers see on the order page.
- Tap **Save window**. Takes under a minute.

Capacity per item sells out on its own — see #4 below.

## 2. Change the stand status

Same dashboard, **Farm stand status** section.

- The **Open right now** checkbox is the one thing to remember to flip on
  Saturday morning and off when you pack up. It drives the dot/pill shown on
  the homepage.
- **On the table today** is the free-text line customers see under the
  stand hours — update it to whatever's actually out.
- Hours and address rarely change, but they're editable here too, and they
  feed the structured data Google reads for your business listing — so if
  you change your actual hours, update both the plain-text **Hours** field
  and the **Structured hours** day/opens/closes fields to match.

## 3. Add a care guide

**Care guides** section → **Add a new guide**.

- Title, a one-line summary (dek), and the body text (plain paragraphs,
  blank line between each).
- Optional: link it to a product by its accession number (e.g. `WG·P·001`)
  so a "buy this" button appears at the bottom of the guide.
- Leave **Published** checked to make it live immediately, or uncheck it to
  save a draft without publishing.
- It appears at `/care-guides/your-title-as-a-url` automatically — no
  developer needed to wire up the page.

To edit or delete an existing guide, open it in the list below the "add
new" form — same fields, plus a delete button.

## 4. Change a price (or pause an item, or set how many you can bake)

**Products** section — one row per item.

- **Price** — type the new dollar amount, tap **Save** on that row.
- **Capacity** — how many of that item can be ordered this window. Leave
  blank for unlimited. Once orders reach this number, that item shows
  "sold out this window" on the order page automatically.
- **Active** — uncheck to pull an item off the site entirely (it stops
  showing on the homepage and order form) without deleting its history.

Each row saves independently — you don't need to save the whole page.

**Items marked "price coming soon".** Pumpkin Loaf and Philodendron don't
have prices yet, so the site shows *Coming soon* where the price goes and
they can't be added to a cart — nobody can be charged an amount that hasn't
been decided. Type a real price into that row and save, and both of those
resolve on their own: the price appears and the item becomes orderable.

**Der Smoking and Occasion Cakes** are the **Reservat** tier. They're listed
on the site and priced, but deliberately aren't add-to-cart items, because
both need a week's notice and a conversation. The order page points people
to the notes box for these instead.

## 5. Export orders

**Orders** section → **Export CSV**. Downloads every order ever placed —
name, contact info, items, pickup or shipping, price, payment status — as a
spreadsheet file you can open in Excel, Numbers, or Google Sheets. The
"branch" column tells you at a glance which orders are pickup, shipping, or
a waitlist entry from someone outside your delivery area.

The **email list** section below it works the same way for your mailing
list — paste addresses (one per line) to bulk-import your existing list of
about seventy, and there's a matching **Export CSV** link for pulling the
list out again later.

---

**A note on the ingredient lists on the kitchen record page:** the admin
panel edits the page-level allergen statements (what's never in the
building, cross-contact, legal basis), but the per-product ingredient list
is edited alongside each product's other fields directly — ask your
developer to extend the admin form to expose it if you want to edit that
text yourself day-to-day, since it wasn't wired into the UI in this build
(the field exists in the data, it's just not yet an admin-editable text box).
