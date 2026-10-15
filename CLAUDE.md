# League In 5 (leaguein5.com)

Static site on Cloudflare Pages, auto-deployed from `main`. The whole site renders
from `stories.json`; a daily edition changes only that file.

To publish or refresh an edition, follow `pipeline/PIPELINE.md` exactly, and run
`python3 pipeline/validate.py` before every push. Don't change index.html, app.js
or styles.css unless Carl asks for a design change.
