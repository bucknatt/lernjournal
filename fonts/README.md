# Too Freakin Cute Demo font

- **File:** `TooFreakinCuteDemo.ttf` (from [1001fonts.com – Too Freakin Cute Demo](https://www.1001fonts.com/too-freakin-cute-demo-font.html))
- **Author:** Misti's Fonts
- **Use in app:** `--font-display` (page titles, section headings — not week date ranges)

## Special symbols (in display titles only)

When this font is active, type these characters in decorated titles (see `js/utils/font-decor.js`):

| Key | Glyph |
|-----|--------|
| `*` | ♥ heart |
| `\|` | ☺ smiley |

Example: `*Lernjournal|` renders like the font preview (♥Lernjournal☺). Lowercase **o** and **i** in words can also show built-in heart shapes in the font.

## Week date lines

Strings like `KW 21 · 18. Mai 2026 – 24. Mai 2026` use **Nunito** via the `.week-range-label` class instead of this display font (no `*` / `|` decoration).

## License

**Free for personal use** (1001Fonts FFP license). Not for commercial use.
