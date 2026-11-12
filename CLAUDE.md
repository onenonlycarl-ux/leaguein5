# League In 5 (leaguein5.com)

Static site on Cloudflare Pages, auto-deployed from `main`. The whole site renders
from `stories.json`; a daily edition changes only that file.

To publish or refresh an edition, follow `pipeline/PIPELINE.md` exactly, and run
`python3 pipeline/validate.py` before every push. Don't change index.html, app.js
or styles.css unless Carl asks for a design change.

`data/standings.json` and `data/schedules.json` are refreshed by the GitHub Actions job in
`.github/workflows/refresh-data.yml` (script: `pipeline/fetch_data.py`). The daily story run
never edits them.

When you change app.js or styles.css, also bump the `?v=` number on their tags in index.html so
browsers fetch the new copy instead of an old cached one.

## Pre-rendered pages (for search engines and link previews)

The site draws itself in the browser, so crawlers and social apps used to see an empty page.
`pipeline/prerender.mjs` runs the real `app.js` in a fake browser and saves finished HTML plus
per-page titles, descriptions, share-card tags and canonical links.

- Generated files, never edit by hand: `team/*.html`, `week.html`, `week/*.html`, `sitemap.xml`,
  `robots.txt`, and the text between `<main id="app">` and `</main>` and between the
  `<!--seo:start-->` and `<!--seo:end-->` markers in `index.html`.
- The daily story run does NOT run it. Pushing `stories.json` triggers
  `.github/workflows/prerender.yml`, and the 3-hourly data refresh runs it too. Both commit the result.
- After changing `app.js`, `styles.css` or the rest of `index.html`, the same workflow rebuilds
  the pages on push. To run it by hand: `npm --prefix pipeline ci && node pipeline/prerender.mjs`.
- `og/*.png` are the 1200x630 share images (made by `pipeline/make_share_images.py`, only rerun if
  the look changes).
- Keep the `<!--seo:start-->` / `<!--seo:end-->` markers and the `<main id="app" ...>` tag in
  `index.html`; the script stops with an error if they are missing.
