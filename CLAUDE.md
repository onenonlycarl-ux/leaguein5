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
