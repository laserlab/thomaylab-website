/* ============================================================================
 * World Cup 2026 Prediction Game — frontend logic
 * ----------------------------------------------------------------------------
 * Renders the group stage + knockout bracket FROM Supabase (single source of
 * truth), lets a logged-in player submit/edit score predictions until each
 * match's kickoff, and shows a live leaderboard.
 *
 * Security note: name + passcode is lightweight. The passcode is hashed
 * (SHA-256) in the browser; only the hash is sent/stored. The hash is also
 * passed as the `x-player-hash` header so RLS policies can gate writes to the
 * caller's own predictions. The anon key below is public by design.
 * ==========================================================================*/

// ---- CONFIG: fill these in after creating your Supabase project -----------
const SUPABASE_URL  = "https://idxoigmmtsclfztbyeej.supabase.co";
const SUPABASE_ANON = "sb_publishable_ogSiGk96ugqwJUqjgC9DGA___RAsJZl";
// ---------------------------------------------------------------------------

const STAGE_LABELS = {
  group: "Group Stage",
  r32: "Round of 32", r16: "Round of 16", qf: "Quarterfinals",
  sf: "Semifinals", third: "Third place", final: "Final",
};

let sb = null;            // supabase client (re-created on login to carry the header)
let me = null;           // { id, display_name, hash }
let matches = [];        // all matches from DB
let myPreds = {};        // match_id -> {pred_home, pred_away}

// ---- tiny helpers ---------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
  return n;
};

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeClient(hash) {
  const headers = hash ? { "x-player-hash": hash } : {};
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers },
    auth: { persistSession: false },
  });
}

const LS_KEY = "wc2026_session";
function saveSession() { if (me) localStorage.setItem(LS_KEY, JSON.stringify(me)); }
function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function clearSession() { localStorage.removeItem(LS_KEY); }

// ---- auth -----------------------------------------------------------------
async function join(name, passcode) {
  const hash = await sha256Hex(passcode);
  // Try to find an existing player with this name.
  const probe = makeClient(hash);
  const { data: existing, error: e1 } = await probe
    .from("players").select("id, display_name, passcode_hash")
    .eq("display_name", name).maybeSingle();
  if (e1) throw e1;

  if (existing) {
    if (existing.passcode_hash !== hash) throw new Error("That name is taken and the passcode doesn't match.");
    me = { id: existing.id, display_name: existing.display_name, hash };
  } else {
    const { data: created, error: e2 } = await probe
      .from("players").insert({ display_name: name, passcode_hash: hash })
      .select("id, display_name").single();
    if (e2) throw e2;
    me = { id: created.id, display_name: created.display_name, hash };
  }
  sb = makeClient(hash);  // authed client carries the header for RLS
  saveSession();
}

function logout() { me = null; myPreds = {}; clearSession(); sb = makeClient(null); renderAll(); }

// ---- data loading ---------------------------------------------------------
let matchesError = null;
async function loadMatches() {
  matchesError = null;
  const { data, error } = await sb.from("matches")
    .select("*").order("stage").order("slot");
  if (error) { matchesError = error.message; console.error("loadMatches:", error); matches = []; return; }
  matches = data || [];
  console.log(`loadMatches: ${matches.length} rows`);
}

async function loadMyPredictions() {
  myPreds = {};
  if (!me) return;
  const { data, error } = await sb.from("predictions")
    .select("match_id, pred_home, pred_away").eq("player_id", me.id);
  if (error) { console.warn("load predictions:", error.message); return; }
  for (const p of data) myPreds[p.match_id] = { pred_home: p.pred_home, pred_away: p.pred_away };
}

async function loadLeaderboard() {
  const { data, error } = await sb.from("leaderboard").select("*");
  if (error) { console.warn("leaderboard:", error.message); return []; }
  return data || [];
}

// ---- prediction save (debounced per match) --------------------------------
const saveTimers = {};
function queueSave(match, homeInput, awayInput, statusEl) {
  clearTimeout(saveTimers[match.id]);
  saveTimers[match.id] = setTimeout(() => savePrediction(match, homeInput, awayInput, statusEl), 500);
}
async function savePrediction(match, homeInput, awayInput, statusEl) {
  if (!me) { statusEl.textContent = "log in to save"; return; }
  const h = parseInt(homeInput.value, 10), a = parseInt(awayInput.value, 10);
  if (Number.isNaN(h) || Number.isNaN(a)) { statusEl.textContent = ""; return; }
  statusEl.textContent = "saving…";
  // Auth + kickoff-lock + upsert are all enforced inside this RPC (server-side),
  // so we don't depend on a custom HTTP header reaching the RLS policy.
  const { error } = await sb.rpc("upsert_prediction", {
    p_player_id: me.id, p_match_id: match.id, p_hash: me.hash, p_home: h, p_away: a,
  });
  if (error) { statusEl.textContent = "✕ " + error.message; statusEl.className = "pred-status err"; return; }
  myPreds[match.id] = { pred_home: h, pred_away: a };
  statusEl.textContent = "✓ saved"; statusEl.className = "pred-status ok";
}

// ---- rendering ------------------------------------------------------------
function isLocked(match) { return new Date(match.kickoff_at) <= new Date(); }

function matchRow(match) {
  const locked = isLocked(match);
  const pred = myPreds[match.id] || {};
  const result = match.played ? `${match.home_goals}–${match.away_goals}` : "";

  const homeIn = el("input", { type: "number", min: "0", max: "99", class: "pred-in",
    value: pred.pred_home ?? "", "aria-label": `${match.home_team} predicted goals` });
  const awayIn = el("input", { type: "number", min: "0", max: "99", class: "pred-in",
    value: pred.pred_away ?? "", "aria-label": `${match.away_team} predicted goals` });
  const status = el("span", { class: "pred-status" });

  if (locked || !me) { homeIn.disabled = true; awayIn.disabled = true; }
  const onIn = () => queueSave(match, homeIn, awayIn, status);
  homeIn.addEventListener("input", onIn);
  awayIn.addEventListener("input", onIn);

  const ko = new Date(match.kickoff_at);
  const koLabel = ko.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return el("div", { class: "fixture" + (locked ? " locked" : "") },
    el("span", { class: "fx-kick" }, locked ? (match.played ? "FT" : "🔒") : koLabel),
    el("span", { class: "fx-team home" }, match.home_team),
    el("span", { class: "fx-pred" }, homeIn, el("span", { class: "fx-colon" }, ":"), awayIn),
    el("span", { class: "fx-team away" }, match.away_team),
    el("span", { class: "fx-result" }, result),
    status,
  );
}

function renderFixtures() {
  // Group stage: group fixtures under each group letter.
  const groupWrap = $("#fixtures-group");
  const koWrap = $("#fixtures-ko");
  if (groupWrap) groupWrap.replaceChildren();
  if (koWrap) koWrap.replaceChildren();

  // Surface load problems instead of silently showing nothing.
  if (groupWrap && matchesError) {
    groupWrap.append(el("p", { class: "auth-msg err" }, "Couldn't load fixtures: " + matchesError));
    return;
  }
  if (groupWrap && matches.length === 0) {
    groupWrap.append(el("p", { class: "muted" }, "No fixtures found in the database."));
    return;
  }

  const byStage = {};
  for (const m of matches) (byStage[m.stage] ||= []).push(m);

  // groups
  if (groupWrap && byStage.group) {
    const byGroup = {};
    for (const m of byStage.group) (byGroup[m.group_label] ||= []).push(m);
    for (const g of Object.keys(byGroup).sort()) {
      const card = el("div", { class: "fx-group" }, el("h4", {}, "Group " + g));
      byGroup[g].forEach(m => card.append(matchRow(m)));
      groupWrap.append(card);
    }
  }
  // knockout
  if (koWrap) {
    ["r32", "r16", "qf", "sf", "third", "final"].forEach(stage => {
      if (!byStage[stage]) return;
      const card = el("div", { class: "fx-group" }, el("h4", {}, STAGE_LABELS[stage]));
      byStage[stage].forEach(m => card.append(matchRow(m)));
      koWrap.append(card);
    });
  }
}

async function renderLeaderboard() {
  const wrap = $("#leaderboard");
  if (!wrap) return;
  const rows = await loadLeaderboard();
  wrap.replaceChildren();
  if (!rows.length) { wrap.append(el("p", { class: "muted" }, "No players yet — be the first to join.")); return; }
  const table = el("table", { class: "lb-table" },
    el("thead", {}, el("tr", {}, el("th", {}, "#"), el("th", { class: "team-cell" }, "Player"),
      el("th", {}, "Pts"), el("th", {}, "Played"))));
  const tb = el("tbody");
  rows.forEach((r, i) => {
    const mine = me && r.player_id === me.id;
    tb.append(el("tr", { class: mine ? "lb-me" : "" },
      el("td", {}, String(i + 1)),
      el("td", { class: "team-cell" }, r.display_name),
      el("td", {}, String(r.total_points)),
      el("td", {}, String(r.scored_matches))));
  });
  table.append(tb);
  wrap.append(table);
}

function renderAuthBar() {
  const bar = $("#auth-bar");
  if (!bar) return;
  bar.replaceChildren();
  if (me) {
    bar.append(
      el("span", { class: "auth-who" }, "Playing as ", el("strong", {}, me.display_name)),
      el("button", { class: "button auth-btn", onclick: logout }, "Log out"),
    );
  } else {
    const name = el("input", { type: "text", placeholder: "Display name", class: "auth-in", maxlength: "40" });
    const pass = el("input", { type: "password", placeholder: "Passcode", class: "auth-in" });
    const msg = el("span", { class: "auth-msg" });
    const go = el("button", { class: "button auth-btn", onclick: async () => {
      msg.textContent = ""; msg.className = "auth-msg";
      if (name.value.trim().length < 2 || pass.value.length < 4) {
        msg.textContent = "Name ≥2 chars, passcode ≥4 chars."; msg.className = "auth-msg err"; return;
      }
      go.disabled = true; go.textContent = "…";
      try {
        await join(name.value.trim(), pass.value);
        if (matches.length === 0) await loadMatches();  // ensure fixtures loaded under the authed client
        await loadMyPredictions();
        renderAll();
      } catch (e) {
        msg.textContent = e.message || String(e); msg.className = "auth-msg err";
        go.disabled = false; go.textContent = "Join / Log in";
      }
    } }, "Join / Log in");
    bar.append(name, pass, go, msg);
  }
}

function renderAll() {
  renderAuthBar();
  renderFixtures();
  renderLeaderboard();
}

// ---- boot -----------------------------------------------------------------
async function boot() {
  if (!window.supabase) { console.error("supabase-js not loaded"); return; }
  if (SUPABASE_URL.includes("YOUR-PROJECT")) {
    $("#auth-bar")?.append(el("p", { class: "muted" },
      "⚙ Not configured yet — set SUPABASE_URL / SUPABASE_ANON in assets/worldcup.js (see WORLDCUP-SETUP.md)."));
    return;
  }
  const saved = loadSession();
  if (saved && saved.hash) { me = saved; sb = makeClient(saved.hash); }
  else { sb = makeClient(null); }
  try {
    await loadMatches();
    if (me) await loadMyPredictions();
  } catch (e) { console.error(e); }
  renderAll();
  // Re-render once a minute so matches lock at kickoff without a page reload.
  setInterval(() => { renderFixtures(); }, 60_000);
}

document.addEventListener("DOMContentLoaded", boot);
