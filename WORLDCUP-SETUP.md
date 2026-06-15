# World Cup 2026 Prediction Game — Setup

The hidden page `worldcup.html` is a multi-user score-prediction game backed by
[Supabase](https://supabase.com) (a hosted Postgres with an auto-generated REST API).
The static site talks to it directly from the browser — no server to run.

## What's in the repo
| File | Purpose |
|------|---------|
| `worldcup.html` | The hidden page: group standings, knockout bracket, prediction inputs, leaderboard. Not linked anywhere (`noindex`). |
| `assets/worldcup.js` | Frontend logic: join/login, render fixtures from the DB, save predictions, leaderboard. **Holds your Supabase config.** |
| `worldcup-supabase.sql` | Schema + scoring + Row Level Security. Run once. |
| `worldcup-seed.sql` | All 72 group fixtures (real teams + UTC kickoff times) + 32 knockout placeholders. Run once, after the schema. |

## Scoring
Each prediction earns the single highest tier that applies:

| Tier | Points |
|------|:------:|
| Exact score (e.g. predict 2–1, actual 2–1) | **4** |
| Correct goal difference (predict 2–1, actual 3–2) | **3** |
| Correct tendency (right winner/draw only) | **2** |
| Wrong outcome | **0** |

## One-time setup (~15–20 min)

### 1. Create a Supabase project
1. Sign up at <https://supabase.com> (free tier is plenty).
2. **New project** → pick a name, a region near your players, set a database password (save it). Wait ~2 min for it to provision.

### 2. Create the schema
1. In the project, open **SQL Editor** → **New query**.
2. Paste the entire contents of `worldcup-supabase.sql`, click **Run**.
3. Open another query, paste `worldcup-seed.sql`, click **Run**. This loads the fixtures.

### 3. Get your API keys
1. **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
   (The anon key is meant to be public — it's safe to commit. Security is enforced by the RLS policies, not by hiding the key.)

### 4. Configure the page
Open `assets/worldcup.js` and edit the two lines at the top:
```js
const SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";  // <- Project URL
const SUPABASE_ANON = "YOUR-ANON-KEY";                      // <- anon/public key
```
Commit and push. Done — visit `/worldcup.html` and click **Join / Log in**.

## Running the game

### Players
- Visit the URL, enter a **display name + passcode**, click **Join / Log in**.
- Enter a predicted score for any match before its kickoff. Saves automatically.
- After kickoff the inputs lock (🔒); other players' picks for that match become visible.
- The leaderboard updates as you enter results.

### You (entering actual results)
Results are entered directly in Supabase (no admin UI on the page):
1. **Table Editor → `matches`**.
2. Find the match, set `home_goals`, `away_goals`, and flip `played` to `true`.
3. The `leaderboard` view recomputes automatically; players see it on reload.

### Updating knockout teams
The knockout rows are seeded as `TBD` placeholders. As groups finish, edit the
`matches` rows for stages `r32`/`r16`/… and replace `home_team` / `away_team`
with the real qualifiers, and fix `kickoff_at` to the official time.

## Security notes (read me)
- **Name + passcode is lightweight.** The passcode is SHA-256 hashed in the
  browser; only the hash is stored and sent (as an `x-player-hash` header used by
  RLS to gate writes to your own picks). It stops casual tampering, not a
  determined attacker who reads the public table. Fine for a lab/friends pool.
- **Pre-kickoff privacy:** RLS hides other players' predictions until a match has
  kicked off, so nobody can copy picks. Your own picks are always visible to you.
- **Results are admin-only:** no public policy grants writing match results; only
  you, via the Supabase dashboard (service role), can set them.

## Local testing without Supabase
Opening `worldcup.html` before configuring keys shows the static standings +
bracket and a "⚙ Not configured yet" note in the prediction area — useful for
checking layout. The prediction/leaderboard features need the keys set.
