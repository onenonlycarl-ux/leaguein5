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
    ${DATA.divisions.filter(d => d.conf === conf).map(d => `
    <section class="block">
      <div class="wrap">
        <div class="sec-head"><div><p class="eyebrow">${d.teams.reduce((n,t)=>n+t.stories.length,0)} stories</p><h2>${esc(d.name)}</h2></div></div>
        <div class="row">${d.teams.map(teamCard).join("")}</div>
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

fetch("/stories.json", {cache:"no-cache"})
  .then(r => r.json())
  .then(d => { DATA = d; route(); })
  .catch(() => { app.innerHTML = `<div class="loading">Today's edition couldn't load. Please refresh.</div>`; });
