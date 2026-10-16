// League In 5: renders the site from /stories.json.
// To publish a new edition, only stories.json changes. The design stays the same.

const COLORS = {
  ARI:["#97233F","#4a0f20"], ATL:["#A71930","#1a1a1a"], BAL:["#241773","#0d0833"], BUF:["#00338D","#C60C30"],
  CAR:["#0085CA","#101820"], CHI:["#0B162A","#C83803"], CIN:["#FB4F14","#1a1a1a"], CLE:["#311D00","#FF3C00"],
  DAL:["#003594","#041E42"], DEN:["#FB4F14","#002244"], DET:["#0076B6","#3b4650"], GB:["#203731","#FFB612"],
  HOU:["#03202F","#A71930"], IND:["#002C5F","#3d5a80"], JAX:["#006778","#101820"], KC:["#E31837","#7a0c1c"],
  LV:["#2b2b2b","#000000"], LAC:["#0080C6","#002244"], LAR:["#003594","#a88a2a"], MIA:["#008E97","#FC4C02"],
  MIN:["#4F2683","#FFC62F"], NE:["#002244","#C60C30"], NO:["#9a7d3e","#101820"], NYG:["#0B2265","#A71930"],
  NYJ:["#125740","#0a2e22"], PHI:["#004C54","#0a2a2e"], PIT:["#101820","#FFB612"], SF:["#AA0000","#8a6d3b"],
  SEA:["#002244","#69BE28"], TB:["#D50A0A","#34302B"], TEN:["#0C2340","#4B92DB"], WAS:["#5A1414","#FFB612"]
};

const app = document.getElementById("app");
let DATA = null;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug = abbr => abbr.toLowerCase();
const title = s => String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const colorVars = abbr => { const [a,b] = COLORS[abbr] || ["#333","#111"]; return `--c1:${a};--c2:${b}`; };
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
const sourceLink = src => {
  if (!src) return "";
  const name = typeof src === "string" ? src : src.name;
  const url = typeof src === "string" ? "" : safeUrl(src.url);
  if (!name) return "";
  return `<p class="source">Source: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener nofollow">${esc(name)} ↗</a>` : esc(name)}</p>`;
};
const allTeams = () => DATA.divisions.flatMap(d => d.teams.map(t => ({...t, division:d.name, conf:d.conf})));

function editionLabel() {
  const parts = [];
  if (DATA.date) {
    const d = new Date(DATA.date + "T12:00:00");
    parts.push(d.toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"}));
  }
  if (DATA.week) parts.push(DATA.week);
  return parts.join(" · ");
}

function teamCard(t) {
  return `<a class="team-card" href="/team/${slug(t.abbr)}" data-link style="${colorVars(t.abbr)}">
    <div class="team-band"><span class="abbr">${esc(t.abbr)}</span>${t.record ? `<span class="rec">${esc(t.record)}</span>` : ""}</div>
    <div class="team-body">
      <h3>${esc(title(t.name))}</h3>
      <p>${esc(t.headline)}</p>
      <div class="meta"><span>${t.stories.length} stories</span><span class="go">Read →</span></div>
    </div>
  </a>`;
}

// ---- standings and schedules (data/*.json, refreshed by GitHub Actions) ----
let STANDINGS = null, SCHEDULES = null;
const recStr = s => `${s.w}-${s.l}${s.t ? "-" + s.t : ""}`;
const pctOf = s => { const g = s.w + s.l + s.t; return g ? (s.w + s.t / 2) / g : 0; };
const pctStr = s => { const p = pctOf(s); return p === 1 ? "1.000" : p.toFixed(3).replace(/^0/, ""); };
const byRank = (a, b) => (pctOf(b[1]) - pctOf(a[1])) || ((b[1].pf - b[1].pa) - (a[1].pf - a[1].pa));
const teamName = abbr => { const t = allTeams().find(x => x.abbr === abbr); return t ? title(t.name) : abbr; };
const nick = abbr => teamName(abbr).split(" ").slice(-1)[0];
const sampleNote = () => (STANDINGS?.sample || SCHEDULES?.sample) ? `<p class="data-note sample">Sample numbers for layout preview only.</p>` : "";
const updatedNote = () => {
  const u = STANDINGS?.updated; if (!u) return "";
  const d = new Date(u);
  return `<p class="data-note">Updated ${d.toLocaleString("en-US", {month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZone:"America/New_York"})} ET</p>`;
};

function standingsTable(abbrs, {seeds=false, cut=0, highlight=""} = {}) {
  if (!STANDINGS) return "";
  let rows = abbrs.filter(a => STANDINGS.teams[a]).map(a => [a, STANDINGS.teams[a]]);
  if (seeds && rows.every(r => r[1].seed)) rows.sort((a, b) => a[1].seed - b[1].seed); else rows.sort(byRank);
  if (!rows.length) return "";
  return `<div class="table-wrap"><table class="stand">
    <thead><tr>${seeds ? "<th class=\"n\">#</th>" : ""}<th class="l">Team</th><th>W-L-T</th><th>PCT</th><th class="hide-sm">PF</th><th class="hide-sm">PA</th><th class="hide-sm">Diff</th><th class="hide-sm">Strk</th></tr></thead>
    <tbody>${rows.map(([a, s], i) => `<tr class="${a === highlight ? "me" : ""}${cut && i === cut ? " cut" : ""}" style="${colorVars(a)}">
      ${seeds ? `<td class="n">${i + 1}</td>` : ""}<td class="l"><a href="/team/${slug(a)}" data-link><i class="dot-c"></i>${esc(teamName(a))}</a></td>
      <td>${recStr(s)}</td><td>${pctStr(s)}</td><td class="hide-sm">${s.pf}</td><td class="hide-sm">${s.pa}</td><td class="hide-sm">${s.pf - s.pa > 0 ? "+" : ""}${s.pf - s.pa}</td><td class="hide-sm">${esc(s.streak)}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

const fmtDay = iso => new Date(iso).toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", timeZone:"America/New_York"});
const fmtTime = iso => new Date(iso).toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit", timeZone:"America/New_York"});

function scheduleTable(abbr) {
  const sc = SCHEDULES?.teams?.[abbr];
  if (!sc) return "";
  const rows = [...sc.games.map(g => ({week:g.week, g})), ...sc.bye.map(w => ({week:w, bye:true}))].sort((a, b) => a.week - b.week);
  const next = sc.games.find(g => !g.done);
  return `<div class="table-wrap"><table class="sched">
    <thead><tr><th class="n">Wk</th><th class="l">Date</th><th class="l">Opponent</th><th class="l"><span class="full">Result / Time</span><span class="short">Result</span></th><th class="hide-sm l">TV</th></tr></thead>
    <tbody>${rows.map(r => {
      if (r.bye) return `<tr class="bye"><td class="n">${r.week}</td><td class="l" colspan="4">Bye week</td></tr>`;
      const g = r.g;
      const res = g.done ? `<b class="res ${g.result}">${g.result}</b> ${g.us}-${g.them}` : `${esc(fmtTime(g.date))}<span class="full"> ET</span>`;
      return `<tr class="${g === next ? "next" : ""}${g.done ? " done" : ""}"><td class="n">${r.week}</td><td class="l"><span class="full">${esc(fmtDay(g.date))}</span><span class="short">${esc(fmtDay(g.date).replace(/^\w+, /, ""))}</span></td>
        <td class="l"><span class="at">${g.home ? "vs" : "@"}</span> <a href="/team/${slug(g.opp)}" data-link><span class="full">${esc(teamName(g.opp))}</span><span class="short">${esc(nick(g.opp))}</span></a>${g === next ? ` <span class="next-tag">Next</span>` : ""}</td>
        <td class="l">${res}</td><td class="hide-sm l">${esc(g.network)}</td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

// ---- This Week page (/week, /week/7) ----
function leagueGames() {
  const games = [];
  for (const [abbr, sc] of Object.entries(SCHEDULES?.teams || {})) {
    for (const g of sc.games) {
      if (!g.home) continue;                       // each game appears once, from the home team's side
      games.push({week:g.week, date:g.date, home:abbr, away:g.opp, network:g.network, done:g.done,
                  hs:g.us, as:g.them});
    }
  }
  return games;
}
function currentWeek(games) {
  const open = games.filter(g => !g.done).map(g => g.week);
  return open.length ? Math.min(...open) : Math.max(...games.map(g => g.week));
}
function gameCard(g) {
  const rec = a => STANDINGS?.teams?.[a] ? `<span class="g-rec">${recStr(STANDINGS.teams[a])}</span>` : "";
  const row = (a, score, win) => `<a class="g-team${win ? " win" : ""}" href="/team/${slug(a)}" data-link style="${colorVars(a)}">
      <i class="dot-c"></i><span class="g-name">${esc(teamName(a))}</span>${rec(a)}<b class="g-score">${g.done ? score : ""}</b></a>`;
  const hw = g.done && g.hs > g.as, aw = g.done && g.as > g.hs;
  return `<article class="game${g.done ? " final" : ""}">
    ${row(g.away, g.as, aw)}${row(g.home, g.hs, hw)}
    <div class="g-foot">${g.done ? "Final" : esc(fmtTime(g.date)) + " ET"}${g.network ? `<span>${esc(g.network)}</span>` : ""}</div>
  </article>`;
}
function renderWeek(n) {
  const games = leagueGames();
  if (!games.length) return renderNotFound();
  const weeks = [...new Set(games.map(g => g.week))].sort((a, b) => a - b);
  const wk = weeks.includes(n) ? n : currentWeek(games);
  document.title = `Week ${wk} NFL games | League In 5`;
  const slate = games.filter(g => g.week === wk).sort((a, b) => a.date.localeCompare(b.date));
  const days = [];
  for (const g of slate) {
    const d = fmtDay(g.date);
    (days.find(x => x.d === d) || (days.push({d, list:[]}), days[days.length - 1])).list.push(g);
  }
  const playing = new Set(slate.flatMap(g => [g.home, g.away]));
  const bye = allTeams().map(t => t.abbr).filter(a => !playing.has(a));
  const prev = weeks.includes(wk - 1), next = weeks.includes(wk + 1);
  app.innerHTML = `
  <section class="team-hero week-hero" style="--c1:#0c0e11;--c2:#15181d">
    <div class="wrap">
      <a class="back" href="/" data-link>← All 32 teams</a>
      <div class="crumb">${esc(DATA.week === `Week ${wk}` ? "This week" : "NFL schedule")}</div>
      <h1>Week ${wk}</h1>
      <div class="sub"><span class="pill">${slate.length} games</span>${bye.length ? `<span>${bye.length} teams on bye</span>` : ""}</div>
    </div>
  </section>
  <div class="wrap">
    <div class="week-nav">
      ${prev ? `<a class="btn btn-sm" href="/week/${wk - 1}" data-link>← Week ${wk - 1}</a>` : "<span></span>"}
      ${next ? `<a class="btn btn-sm" href="/week/${wk + 1}" data-link>Week ${wk + 1} →</a>` : "<span></span>"}
    </div>
    ${days.map(x => `<h2 class="day-h">${esc(x.d)}</h2><div class="games">${x.list.map(gameCard).join("")}</div>`).join("")}
    ${bye.length ? `<h2 class="day-h">On bye</h2><div class="picker-row bye-row">${bye.map(a => `<a class="chip chip-dark" href="/team/${slug(a)}" data-link><i style="background:${(COLORS[a]||["#333"])[0]}">${esc(a)}</i>${esc(nick(a))}</a>`).join("")}</div>` : ""}
    ${updatedNote()}${sampleNote()}
  </div>`;
  window.scrollTo(0, 0);
}

function renderHome() {
  document.title = "League In 5 | 32 Teams. 5 Stories. One League.";
  const teams = allTeams();
  const top = DATA.top || [];
  const confs = [...new Set(DATA.divisions.map(d => d.conf))];

  app.innerHTML = `
  <section class="hero">
    <div class="wrap hero-inner">
      <div class="edition"><span class="dot"></span>${esc(editionLabel() || "Today's edition")}</div>
      <h1>32 Teams. 5 Stories.<br><span>One League.</span></h1>
      <p class="lede">${esc(DATA.intro || "Every NFL team, five stories each, every morning.")}</p>
      <div class="hero-actions">
        <a class="btn" href="/#newsletter" data-link>Get the daily email →</a>
        <a class="btn btn-ghost" href="#top5">Read today's top stories</a>
        ${SCHEDULES ? `<a class="btn btn-ghost" href="/week" data-link>This week's games</a>` : ""}
      </div>
      <div class="picker">
        <div class="picker-label">Jump to your team</div>
        <div class="picker-row">
          ${teams.map(t => `<a class="chip" href="/team/${slug(t.abbr)}" data-link><i style="background:${(COLORS[t.abbr]||["#333"])[0]}">${esc(t.abbr)}</i>${esc(title(t.name).split(" ").slice(-1)[0])}</a>`).join("")}
        </div>
      </div>
    </div>
  </section>

  ${top.length ? `
  <section class="block" id="top5">
    <div class="wrap">
      <div class="sec-head"><div><p class="eyebrow">Today's top stories</p><h2>What everyone's talking about</h2></div></div>
      <div class="top-grid">
        ${top.map((s,i) => `<article class="top-card${i===0?" lead":""}">
          <span class="tag">${esc(s.label)}</span>
          <h3>${esc(s.headline)}</h3>
          ${s.dek ? `<p>${esc(s.dek)}</p>` : ""}
          ${sourceLink(s.source)}
        </article>`).join("")}
      </div>
    </div>
  </section>` : ""}

  ${confs.map(conf => `
    <div class="wrap" id="${/american/i.test(conf) ? "afc" : "nfc"}"><h2 class="conf-title">${esc(title(conf))}</h2></div>
    ${STANDINGS ? `<section class="block"><div class="wrap">
      <div class="sec-head"><div><p class="eyebrow">Playoff picture</p><h2>${/american/i.test(conf) ? "AFC" : "NFC"} standings</h2></div></div>
      ${standingsTable(DATA.divisions.filter(d => d.conf === conf).flatMap(d => d.teams.map(t => t.abbr)), {seeds:true, cut:7})}
      ${updatedNote()}${sampleNote()}
    </div></section>` : ""}
    ${DATA.divisions.filter(d => d.conf === conf).map(d => `
    <section class="block">
      <div class="wrap">
        <div class="sec-head"><div><p class="eyebrow">${d.teams.reduce((n,t)=>n+t.stories.length,0)} stories</p><h2>${esc(d.name)}</h2></div></div>
        <div class="row">${d.teams.map(teamCard).join("")}</div>
        ${STANDINGS ? `<h3 class="sub-h">${esc(d.name)} standings</h3>${standingsTable(d.teams.map(t => t.abbr))}` : ""}
      </div>
    </section>`).join("")}
  `).join("")}`;

  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  else window.scrollTo(0, 0);
}

function renderTeam(abbr) {
  const t = allTeams().find(x => slug(x.abbr) === abbr);
  if (!t) return renderNotFound();
  document.title = `${title(t.name)} | League In 5`;
  const rivals = DATA.divisions.find(d => d.name === t.division).teams.filter(x => x.abbr !== t.abbr);

  app.innerHTML = `
  <section class="team-hero" style="${colorVars(t.abbr)}">
    <div class="wrap">
      <a class="back" href="/" data-link>← All 32 teams</a>
      <div class="crumb">${esc(t.division)} · ${esc(editionLabel())}</div>
      <h1>${esc(title(t.name))}</h1>
      <div class="sub">${t.record ? `<span class="pill">${esc(t.record)}</span>` : ""}<span>Today's 5 stories</span></div>
    </div>
  </section>
  <div class="wrap" style="${colorVars(t.abbr)}">
    <div class="stories">
      ${t.stories.map((s,i) => `<article class="story">
        <div class="num">${i+1}</div>
        <div class="body"><span class="tag">${esc(s.cat)}</span><h2>${esc(s.text)}</h2>${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ""}${sourceLink(s.source)}</div>
      </article>`).join("")}
    </div>
  </div>
  ${SCHEDULES?.teams?.[t.abbr] ? `<section class="block"><div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">2026 season</p><h2>${esc(title(t.name))} schedule</h2></div></div>
    ${scheduleTable(t.abbr)}${updatedNote()}${sampleNote()}
  </div></section>` : ""}
  ${STANDINGS ? `<section class="block"><div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Standings</p><h2>${esc(t.division)}</h2></div></div>
    ${standingsTable([t.abbr, ...rivals.map(x => x.abbr)], {highlight:t.abbr})}
  </div></section>` : ""}
  <section class="block">
    <div class="wrap">
      <div class="sec-head"><div><p class="eyebrow">Around the division</p><h2>More from the ${esc(t.division)}</h2></div><a class="see-all" href="/" data-link>All teams →</a></div>
      <div class="row">${rivals.map(teamCard).join("")}</div>
    </div>
  </section>`;
  window.scrollTo(0, 0);
}

function renderNotFound() {
  app.innerHTML = `<section class="block"><div class="wrap"><h2 class="conf-title">Team not found</h2><p style="margin-top:16px"><a class="see-all" href="/" data-link>← Back to all 32 teams</a></p></div></section>`;
}

function renderWelcome() {
  document.title = "You're in | League In 5";
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
  robots.content = "noindex";
  app.innerHTML = `
  <section class="hero welcome-hero">
    <div class="wrap hero-inner">
      <div class="edition"><span class="dot"></span>Subscription confirmed</div>
      <h1>You're in.<br><span>Welcome to League In 5.</span></h1>
      <p class="lede">Every NFL team, five stories each, delivered to your inbox. The daily email is launching soon, and you're on the list for the very first edition.</p>
      <div class="hero-actions">
        <a class="btn" href="/" data-link>Read today's 160 stories →</a>
      </div>
    </div>
  </section>
  <section class="block">
    <div class="wrap">
      <div class="sec-head"><div><p class="eyebrow">Two quick things</p><h2>Make sure it reaches you</h2></div></div>
      <div class="tips">
        <article class="top-card"><span class="tag">Step 1</span><h3>Add us to your contacts</h3><p>Save <b>hello@leaguein5.com</b> so the morning email lands in your inbox, not spam or Promotions.</p></article>
        <article class="top-card"><span class="tag">Step 2</span><h3>Pick your team</h3><p>Bookmark your team's page for its five stories every day.</p><p><a class="see-all" href="/#afc" data-link>Find your team →</a></p></article>
      </div>
    </div>
  </section>`;
  window.scrollTo(0, 0);
}

function route() {
  if (/^\/welcome\/?$/.test(location.pathname)) return renderWelcome();
  const w = location.pathname.match(/^\/week(?:\/(\d+))?\/?$/);
  if (w) return renderWeek(w[1] ? +w[1] : 0);
  const m = location.pathname.match(/^\/team\/([a-z]+)\/?$/);
  m ? renderTeam(m[1]) : renderHome();
}

// Newsletter signup (Kit form 10048046)
const KIT_FORM = "https://app.kit.com/forms/10048046/subscriptions";
document.addEventListener("submit", async e => {
  const form = e.target.closest("form.signup");
  if (!form) return;
  e.preventDefault();
  const msg = form.querySelector(".signup-msg");
  const btn = form.querySelector("button");
  const email = form.querySelector("input[type=email]").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Please enter a valid email address."; msg.className = "signup-msg err"; return; }
  btn.disabled = true; btn.textContent = "Signing you up…";
  try {
    const body = new FormData(); body.append("email_address", email);
    const r = await fetch(KIT_FORM, { method: "POST", body, headers: { Accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || (j.status && j.status !== "success")) throw new Error(j.errors?.messages?.join(" ") || "error");
    form.classList.add("done");
    msg.textContent = "Almost there! Check your inbox and tap the button in our email to confirm.";
    msg.className = "signup-msg ok";
  } catch (err) {
    msg.textContent = "Something went wrong. Please try again in a moment.";
    msg.className = "signup-msg err";
    btn.disabled = false; btn.textContent = "Get the daily email";
  }
});

document.addEventListener("click", e => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname === location.pathname && url.hash) {
    history.pushState(null, "", url.pathname + url.hash);
    document.querySelector(url.hash)?.scrollIntoView({behavior:"smooth"});
    return;
  }
  history.pushState(null, "", url.pathname + url.hash);
  route();
});
window.addEventListener("popstate", route);
document.getElementById("yr").textContent = new Date().getFullYear();

// Standings and schedules are optional: if either file is missing the page still renders without them.
const optional = path => fetch(path, {cache:"no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
Promise.all([
  fetch("/stories.json", {cache:"no-cache"}).then(r => r.json()),
  optional("/data/standings.json"),
  optional("/data/schedules.json")
])
  .then(([d, st, sc]) => { DATA = d; STANDINGS = st; SCHEDULES = sc; route(); })
  .catch(() => { app.innerHTML = `<div class="loading">Today's edition couldn't load. Please refresh.</div>`; });
