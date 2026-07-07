# Thomay Lab Website

The website for the Thomay Lab at the University at Buffalo. Built with [Eleventy](https://www.11ty.dev/): plain HTML pages rendered into a shared layout (header, nav, footer, theme switcher defined once), with lab data (people, news, featured publications) in simple JSON files.

## Quick Start

Edit content, push to `main`, and GitHub Actions builds and deploys the site to `qislab.org` in about 1–2 minutes.

**Where content lives:**
- `_data/people.json` — lab members shown on the People page
- `_data/news.json` — news items shown on the homepage
- `_data/featured_pubs.json` — the hand-curated highlighted publications (homepage + publications page)
- `_data/nav.json` — the navigation bar (one place, all pages)
- `index.html`, `openings.html`, `journal-club.html`, … — page text (front matter on top, content below; no header/footer boilerplate)
- `assets/publications.json` — full publication list, auto-synced from ORCID weekly (don't edit by hand)

## Local preview (optional)

```bash
npm install        # once
npm run serve      # builds and serves at http://localhost:8080, rebuilds on save
```

`npm run build` writes the site to `_site/` (gitignored).

## Features

- **Dark theme with laser-inspired color options** — Default (blue), Green (Nd:YAG), Red (HeNe), or Blue (GaN)
- **ORCID integration** — the full publication list renders at build time from `assets/publications.json`, which `pubs.yml` refreshes weekly
- **Responsive design** — works on mobile and desktop
- **World Cup prediction game** — `worldcup.html` + `assets/worldcup.js`, backed by Supabase

## Directory

```
.
├── index.html, people.html, ...      # Pages: front matter + content only
├── worldcup.html                     # Prediction game (Supabase-backed)
├── 404.html                          # Error page
├── _includes/
│   ├── layouts/base.njk              # The one shared layout (head, header, footer)
│   ├── header.njk, footer.njk        # Shared chrome
│   ├── pubs-featured.njk             # Highlighted publications list
│   └── worldcup-style.njk            # World Cup page CSS
├── _data/
│   ├── people.json, news.json        # Content data
│   ├── featured_pubs.json, nav.json
│   └── pubs.js                       # Groups assets/publications.json by year at build time
├── assets/
│   ├── style.css                     # All site styling (themes via CSS custom properties)
│   ├── site.js                       # Theme switcher + footer year (shared)
│   ├── worldcup.js                   # Prediction game logic
│   ├── publications.json             # Publication metadata (auto-synced)
│   └── img/                          # Lab photos (web-compressed)
├── outreach/bb84/                    # Self-contained BB84 demo pages (copied verbatim)
├── scripts/build_publications.py     # ORCID sync script
├── .github/workflows/
│   ├── pubs.yml                      # Weekly ORCID sync (commits publications.json)
│   └── deploy.yml                    # Builds with Eleventy, deploys to GitHub Pages
├── eleventy.config.js                # Build configuration
├── CREDITS.md                        # Photo attribution
└── README.md                         # This file
```

## Making Changes

**People / news / featured publications**: edit the matching file in `_data/` and push. No HTML needed.

**Page text**: edit the `.html` page. The block between the `---` lines on top (front matter) sets the page title and URL; everything below is the page content. Header, nav, and footer come from the layout automatically.

**Navigation**: edit `_data/nav.json` — it updates every page.

**Styling**: all CSS is in `assets/style.css`. CSS custom properties (variables) make theme changes easy — just update `--accent` and `--link` for each theme.

**Images**: add photos to `assets/img/` (compress to ~1800px wide first, e.g. `sips --resampleWidth 1800 -s format jpeg -s formatOptions 80 in.jpg --out out.jpg`). Update captions in the HTML and credits in `CREDITS.md`.

## Deployment

Push to `main` → the **Deploy site** action builds with Eleventy and publishes to GitHub Pages (`qislab.org`). The weekly **Build publications** action commits a fresh `assets/publications.json` and automatically triggers a redeploy.

GitHub Pages must be set to build from **GitHub Actions** (repo Settings → Pages → Source). Rollback: revert the offending commit on `main` and the next deploy restores the site.

## Customization

- **Theme colors**: edit CSS custom properties in `assets/style.css` (search for `:root[data-theme="..."]`)
- **ORCID ID**: update `0000-0003-2271-6803` in `scripts/build_publications.py`
- **Domain**: currently points to `qislab.org` via `CNAME`. Update DNS and GitHub Pages settings if needed

## Credits

Website design and development by the Thomay Lab. Photos by Douglas Levere (University at Buffalo Photography) and Tim Thomay. See `CREDITS.md` for full attribution.
