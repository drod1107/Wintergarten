# Wintergarten design language

Authoritative record of the site's visual system. If this file and the code
disagree, the code is wrong. Supersede this document by replacing it — do not
keep parallel versions.

**Current direction:** Wet Stone & Chlorophyll (colour) + The Conservatory (typeset)
**Source:** Claude Design project `0326f1d5-4249-4710-bb22-45c37163703a`, file
`Color Directions.dc.html`, booked 21 Aug 2026.
**Supersedes:** the "Herbarium" palette (sage rag / burnt ochre / dried brass)
and the Archivo Narrow + Jost + Cormorant Garamond typeset.

---

## Colour — Wet Stone & Chlorophyll

The idea is an inversion of the 2026 consensus. Where the previous palette was
warm parchment, muted copper and moss — which is what everyone else is doing —
this drains everything to mineral and spends its only saturated colour on a
single living green. Muted earth tones are the trend; muted *mineral* tones with
one unmuted plant colour is the opposite of it.

Structure, type roles and layout are untouched by the colour change. Five tokens
carry it.

| Token | Value | Name | Role |
|---|---|---|---|
| `--paper` | `#E8E7E1` | limestone | the sheet |
| `--paper-2` | `#DAD9D1` | dry stone | shadowed sheet, inset panels |
| `--ink` | `#1F2622` | wet slate | body text |
| `--forest` | `#1F2622` | wet slate | dark plate ground — same stone as the ink |
| `--rust` | `#145C34` | chlorophyll | the only saturated colour |
| `--gold` | `#C4BEAB` | bone | labels and rules on slate grounds |
| `--accent-lift` | `#6ECB93` | — | chlorophyll, lifted, when the accent must sit on slate |
| `--label` | `#4F5A52` | — | secondary label text on limestone |
| `--hair` | `rgba(31,38,34,.28)` | — | rules |
| `--hair-2` | `rgba(31,38,34,.13)` | — | faint rules |

### Contrast — measured, not estimated

| Pair | Ratio |
|---|---|
| slate on limestone | 12.5:1 |
| chlorophyll on limestone | 6.5:1 |
| chlorophyll on dry stone | 5.7:1 |
| limestone on chlorophyll | 6.5:1 |
| bone on slate | 8.3:1 |
| accent-lift on slate | 7.8:1 |
| label on limestone / dry stone | 5.8:1 / 5.1:1 |

All AA at every size used.

### Rules

- Chlorophyll is the only saturated colour on the page. If something needs to
  stand out and chlorophyll is already spent nearby, make it quieter, not
  another hue.
- On a slate ground the accent lifts to `--accent-lift`. Never use `--rust` on
  slate; it does not clear AA there.
- Labels and rules on slate use bone (`--gold`), not `--label`.
- The paper grain in `body::before` is keyed to chlorophyll and bone. It must
  never carry a hue that is not in this table.

---

## Typeset — The Conservatory

Italiana is a fashion-house cut: hairline strokes, enormous tracking, caps only.
On its own it reads as couture. Set against a typewriter it stops reading as
couture and starts reading as an estate glasshouse plaque — which is the whole
point of the pairing.

| Role | Face | Weights | CSS variable |
|---|---|---|---|
| Display | Italiana | 400 only | `--font-display` |
| Body | Petrona | 300 / 400 / 600, roman + italic | `--font-body` |
| Labels, nav, buttons, figures | Courier Prime | 400 / 700 | `--font-mono` |
| Binomials | Petrona italic | 400 | `--font-body` |

### Rules

- **Italiana is caps-only and 400-only.** Every rule that uses `--font-display`
  sets `font-weight: 400` and `text-transform: uppercase`. Asking for 600 or 700
  makes the browser synthesise a bold, which destroys a hairline face.
- **`.display` and `h1`–`h4` need `letter-spacing: .13em` and
  `line-height: 1.05`.** Italiana breaks at the old `-.005em` / `.92` — the caps
  collide and the tracking that gives the face its character disappears.
- **Display is for display.** Anything small and uppercase — nav items, buttons,
  spec labels, figures, prices, chips — is a *label* and takes Courier Prime. A
  hairline face at 12px is not legible and not the intent.
- Petrona carries all running text. Its italic is the binomial face; there is no
  separate serif.

---

## Still open

- **Logo lockup.** `public/images/logo.jpg` has its ground baked into the JPEG.
  It is currently re-keyed to limestone so the seam is invisible, but a
  transparent re-export from the source artwork is the real fix and needs the
  owner's original file.
