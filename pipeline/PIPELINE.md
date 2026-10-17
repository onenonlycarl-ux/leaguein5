# League In 5 daily pipeline

The site renders everything from `/stories.json`. Publishing a new edition means
replacing that one file and pushing to `main`. Cloudflare Pages rebuilds the site
from GitHub within a minute or two. Never edit `index.html`, `app.js` or
`styles.css` as part of a daily run.

## Daily run (5 AM ET)

1. Research the latest NFL news for all 32 teams (last 24 to 48 hours; older only
   if a team has nothing new). Use web search and read real articles.
2. Write one file per division into `pipeline/work/<division-slug>.json`
   (`afc-east.json`, `afc-north.json`, ... `nfc-west.json`). One researcher per
   division, all eight running in parallel, works best.
3. Pick the five top stories of the day (one per label below) and write the intro.
4. Run `python3 pipeline/build.py` to assemble `stories.json`.
5. Run `python3 pipeline/validate.py`. Fix every problem it lists, then rerun.
6. Commit `stories.json` with the message `Edition YYYY-MM-DD` and push to `main`.

## stories.json shape

```json
{
  "date": "2026-10-15",
  "week": "Week 6",
  "intro": "2 to 3 sentences on the day's league-wide picture, ending with '160 stories across all 32 teams.'",
  "top": [
    {"label": "Biggest Story", "headline": "...", "dek": "2 to 3 sentences", "source": {"name": "NFL.com", "url": "https://..."}},
    {"label": "Injury Watch", "...": "..."},
    {"label": "Player Spotlight", "...": "..."},
    {"label": "Stat of the Day", "...": "..."},
    {"label": "What's Next", "...": "..."}
  ],
  "divisions": [ /* 8 division objects, AFC East, North, South, West, then NFC East, North, South, West */ ]
}
```

Each division file (and each entry in `divisions`):

```json
{
  "name": "AFC East",
  "conf": "American Football Conference",
  "teams": [
    {
      "abbr": "BUF",
      "name": "Buffalo Bills",
      "record": "4-1",
      "headline": "Short card teaser, under 60 characters",
      "stories": [
        {"cat": "Biggest Story",    "text": "Headline", "summary": "2 to 4 sentences", "source": {"name": "ESPN", "url": "https://..."}},
        {"cat": "Injury Report",    "...": "..."},
        {"cat": "Player Spotlight", "...": "..."},
        {"cat": "Stat of the Day",  "...": "..."},
        {"cat": "What's Next",      "...": "..."}
      ]
    }
  ]
}
```

Team order inside each division (the validator enforces it):
AFC East BUF MIA NE NYJ · AFC North BAL CIN CLE PIT · AFC South HOU IND JAX TEN ·
AFC West DEN KC LV LAC · NFC East DAL NYG PHI WAS · NFC North CHI DET GB MIN ·
NFC South ATL CAR NO TB · NFC West ARI LAR SF SEA.
NFC conf string: "National Football Conference".

## What each story category means

- **Biggest Story**: the most important thing happening with the team right now.
- **Injury Report**: current injury designations, practice participation, returns.
- **Player Spotlight**: one player's recent performance or role, with numbers.
- **Stat of the Day**: lead the headline with the number ("582: ...").
- **What's Next**: the next game (opponent, day, time ET, network) and what to watch.
  For a team on bye, say so and name the game after the bye.

## Accuracy rules

- Every story needs a real source with a working article URL you actually read.
- Records, scores, dates and stats must come from sources, never from memory.
- If you cannot confirm something, leave it out and pick a different story.
- No betting picks, no rumors presented as fact.

## Voice rules (Carl's, non-negotiable)

- Sound like a veteran beat reporter who was at practice yesterday. Plain, specific, confident.
- No em dashes or en dashes. Use periods, commas or colons.
- Never use: crucial, pivotal, testament, showcase, leverage.
- Active voice only. No stacked adjectives.
- Write every sentence in your own words. Do not copy sentences from articles.
