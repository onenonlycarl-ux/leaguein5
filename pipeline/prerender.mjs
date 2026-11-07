// League In 5: pre-render static HTML pages.
//
// The site draws itself in the browser (app.js). Search engines and social apps often
// don't run that JavaScript, so they only see "Loading today's edition...".
// This script runs the real app.js once per page (home, 32 teams, each week) inside a
// fake browser (jsdom) and saves the finished HTML, plus per-page titles, descriptions,
// share-card tags, canonical links, sitemap.xml and robots.txt.
//
// app.js still runs for real visitors and redraws the same content with fresh data, so
// nothing about the design or behaviour changes.
//
// Usage (from the repo root):   npm --prefix pipeline ci && node pipeline/prerender.mjs
// It is safe to run repeatedly: output is rebuilt from index.html + stories.json + data/.

import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://leaguein5.com";
const SEO_START = "<!--seo:start-->";
const SEO_END = "<!--seo:end-->";

const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const readJson = p => { try { return JSON.parse(read(p)); } catch { return null; } };

const SHELL = read("index.html");
const APP_JS = read("app.js");
const DATA = readJson("stories.json");
const SCHEDULES = readJson("data/schedules.json");
if (!DATA) throw new Error("stories.json is missing or not valid JSON");
if (!/<main id="app"[^>]*>[\s\S]*?<\/main>/.test(SHELL)) throw new Error('index.html has no <main id="app"> block');
if (!SHELL.includes(SEO_START) || !SHELL.includes(SEO_END)) throw new Error("index.html is missing the <!--seo:start--> / <!--seo:end--> markers");

// ---------- small helpers ----------
const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s, n = 158) => {
  s = String(s).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
};
const noEnd = s => String(s).trim().replace(/[.!?:;,\s]+$/, "");
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const shortDate = DATA.date
  ? new Date(DATA.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  : "today";

// ---------- render one route in a fake browser ----------
// Always start from an empty "Loading" page, even when index.html already holds a pre-rendered
// home page from an earlier run. Otherwise we could capture stale content instead of the new render.
const BLANK_SHELL = SHELL.replace(/(<main id="app"[^>]*>)[\s\S]*?(<\/main>)/,
  (_, a, b) => `${a}\n  <div class="loading">Loading today's edition…</div>\n${b}`);

async function render(urlPath) {
  const dom = new JSDOM(BLANK_SHELL, { url: SITE + urlPath, runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = function () {};
  w.fetch = async p => {
    const file = path.join(ROOT, String(p).split("?")[0]);
    if (!fs.existsSync(file)) return { ok: false, json: async () => null };
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, "utf8")) };
  };
  w.eval(APP_JS);
  const app = w.document.getElementById("app");
  for (let i = 0; i < 200 && (!app.children.length || app.querySelector(".loading")); i++) {
    await new Promise(r => setTimeout(r, 5));
  }
  if (app.querySelector(".loading") || !app.children.length) {
    throw new Error(`Rendering ${urlPath} did not finish (the page showed: "${app.textContent.trim().slice(0, 80)}")`);
  }
  // Read everything we need BEFORE closing the window (a closed jsdom document is emptied).
  const d = w.document;
  const out = {
    html: app.innerHTML,
    title: d.title,
    h1: (d.querySelector("h1")?.textContent || "").trim(),
    hasTop5: !!d.querySelector("#top5"),
    storyCount: d.querySelectorAll("article.story").length,
    gameCount: d.querySelectorAll(".games .game").length,
    weekH1: (d.querySelector(".week-hero h1")?.textContent || "").trim(),
    gamesPill: (d.querySelector(".week-hero .pill")?.textContent || "").trim(),
  };
  w.close();
  return out;
}

// ---------- head tags for one page ----------
function seoBlock({ title, description, canonical, image, imageAlt, jsonLd }) {
  return [
    SEO_START,
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}">`,
    `<link rel="canonical" href="${escAttr(canonical)}">`,
    `<meta property="og:site_name" content="League In 5">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${escAttr(canonical)}">`,
    `<meta property="og:image" content="${escAttr(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escAttr(imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(description)}">`,
    `<meta name="twitter:image" content="${escAttr(image)}">`,
    ...jsonLd.map(ld),
    SEO_END,
  ].join("\n  ");
}

function buildPage(seo, appHtml) {
  return SHELL
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => seoBlock(seo))
    .replace(/(<main id="app"[^>]*>)[\s\S]*?(<\/main>)/, (_, a, b) => `${a}\n${appHtml}\n${b}`);
}

let written = 0, unchanged = 0;
function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) { unchanged++; return; }
  fs.writeFileSync(file, content);
  written++;
}

// ---------- build all pages ----------
const sitemap = []; // {loc, lastmod}
const teams = DATA.divisions.flatMap(d => d.teams.map(t => ({ ...t, division: d.name })));
const dataDay = DATA.date || new Date().toISOString().slice(0, 10);
const schedDay = (SCHEDULES?.updated || dataDay).slice(0, 10);
const crumbs = items => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
});

// Home
{
  const r = await render("/");
  if (!/32 Teams\./.test(r.h1) || !r.hasTop5) {
    throw new Error("Home page did not render as expected");
  }
  const lead = DATA.top?.[0]?.headline ? noEnd(DATA.top[0].headline) : "";
  const description = clip(`${DATA.week ? DATA.week + " " : ""}NFL news for all 32 teams${lead ? ": " + lead : ""}. Five stories per team, updated every morning.`);
  write("index.html", buildPage({
    title: r.title,
    description,
    canonical: SITE + "/",
    image: SITE + "/og/default.png",
    imageAlt: "League In 5: 32 Teams. 5 Stories. One League.",
    jsonLd: [
      { "@context": "https://schema.org", "@type": "WebSite", name: "League In 5", url: SITE + "/", description: "The daily NFL briefing: five stories for every one of the 32 teams, every morning." },
      { "@context": "https://schema.org", "@type": "Organization", name: "League In 5", url: SITE + "/", logo: SITE + "/logo-512.png" },
    ],
  }, r.html));
  sitemap.push({ loc: SITE + "/", lastmod: dataDay });
}

// Team pages
for (const t of teams) {
  const abbr = t.abbr.toLowerCase();
  const r = await render(`/team/${abbr}`);
  if (r.h1.toLowerCase() !== t.name.toLowerCase() || r.storyCount !== t.stories.length) {
    throw new Error(`Team page /team/${abbr} did not render as expected (heading was "${r.h1}")`);
  }
  const heads = t.stories.slice(0, 2).map(s => noEnd(s.text));
  // Lead with the day's two headlines; add the brand line only if it fits without cutting anything.
  const base = `${t.name} news, ${shortDate}: ${heads.join(". ")}.`;
  const full = `${base} Five stories every morning.`;
  const description = full.length <= 158 ? full : clip(base);
  write(`team/${abbr}.html`, buildPage({
    title: r.title,
    description,
    canonical: `${SITE}/team/${abbr}`,
    image: `${SITE}/og/${abbr}.png`,
    imageAlt: `${t.name} news from League In 5`,
    jsonLd: [crumbs([["League In 5", SITE + "/"], [t.name, `${SITE}/team/${abbr}`]])],
  }, r.html));
  sitemap.push({ loc: `${SITE}/team/${abbr}`, lastmod: dataDay });
}

// Week pages (only if the schedule file exists)
if (SCHEDULES?.teams) {
  const weeks = [...new Set(Object.values(SCHEDULES.teams).flatMap(sc => sc.games.map(g => g.week)))].sort((a, b) => a - b);
  const weekPage = async (urlPath, rel, wkNumber) => {
    const r = await render(urlPath);
    const wk = wkNumber ?? Number((r.title.match(/Week (\d+)/) || [])[1]);
    if (!wk || !r.gameCount || (wkNumber && r.weekH1 !== `Week ${wkNumber}`)) {
      throw new Error(`Week page ${urlPath} did not render as expected`);
    }
    const games = r.gamesPill;
    const description = clip(`NFL Week ${wk} schedule${games ? ": " + games : ""}, with kickoff times, TV networks, records and final scores. Updated through the season.`);
    write(rel, buildPage({
      title: r.title,
      description,
      canonical: `${SITE}/week/${wk}`,
      image: SITE + "/og/default.png",
      imageAlt: `NFL Week ${wk} schedule from League In 5`,
      jsonLd: [crumbs([["League In 5", SITE + "/"], [`Week ${wk}`, `${SITE}/week/${wk}`]])],
    }, r.html));
    return wk;
  };
  await weekPage("/week", "week.html");         // "current week" page; points to /week/N as its canonical
  for (const n of weeks) {
    await weekPage(`/week/${n}`, `week/${n}.html`, n);
    sitemap.push({ loc: `${SITE}/week/${n}`, lastmod: schedDay });
  }
}

// sitemap.xml + robots.txt
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
write("sitemap.xml", xml);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Pre-render done: ${sitemap.length} pages in sitemap, ${written} files written, ${unchanged} unchanged.`);
