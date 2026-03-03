# Thomay Lab Website

The website for the Thomay Lab at the University at Buffalo. Built with clean, lightweight HTML and CSS—no frameworks or build tools needed.

## Quick Start

Just edit the HTML files directly and push to GitHub. The site auto-deploys via GitHub Pages.

**Main files to edit:**
- `index.html` — Lab overview, news, research highlights, teaching, contact
- `publications.html` — Featured publications (5 hand-curated, 37 total synced from ORCID weekly)
- `journal-club.html` — Quantum Optics Journal Club schedule and past talks
- `people.html` — Lab members and their profiles
- `openings.html` — Job postings and opportunities

## Features

- **Dark theme with laser-inspired color options** — Switch between Default (blue), Green (Nd:YAG), Red (HeNe), or Blue (GaN) themes
- **ORCID integration** — Publications auto-sync weekly via GitHub Actions
- **Responsive design** — Works on mobile and desktop
- **No JavaScript required for core content** — Theme switcher and publication sync use minimal JS

## Directory

```
.
├── index.html                    # Main homepage
├── publications.html             # Publication list
├── journal-club.html             # Journal club info & schedule
├── people.html                   # Team members
├── openings.html                 # Job openings
├── 404.html                      # Error page
├── assets/
│   ├── style.css                 # All styling (light + laser themes)
│   ├── publications.js           # Publication list rendering
│   ├── publications.json         # Publication metadata (auto-synced)
│   └── img/                      # Lab photos & images
├── scripts/
│   └── build_publications.py     # ORCID sync script
├── .github/
│   └── workflows/pubs.yml        # Auto-sync publications weekly
├── CREDITS.md                    # Photo attribution
└── README.md                     # This file
```

## Making Changes

**Content**: Edit any `.html` file and push to GitHub. Changes go live in seconds.

**Styling**: All CSS is in `assets/style.css`. CSS custom properties (variables) make theme changes easy—just update `--accent` and `--link` for each theme.

**Publications**: Five hand-curated publications appear on the homepage and publications page. All 37 publications from ORCID sync automatically every week. Update the featured list in the HTML if needed.

**Images**: Add photos to `assets/img/`. Update captions and credits in the HTML and in `CREDITS.md`.

## Deployment

Push to `main` branch → GitHub Pages auto-deploys to `qislab.org`

The site serves from the root (`/`) of the repository via GitHub Pages. No special setup needed beyond enabling GitHub Pages on this repo.

## Customization

- **Theme colors**: Edit CSS custom properties in `assets/style.css` (search for `:root[data-theme="..."]`)
- **ORCID ID**: Update `0000-0003-2271-6803` in `scripts/build_publications.py` and GitHub Actions workflow
- **Domain**: Currently points to `qislab.org`. Update DNS and GitHub Pages settings if needed

## Credits

Website design and development by the Thomay Lab. Photos by Douglas Levere (University at Buffalo Photography) and Tim Thomay. See `CREDITS.md` for full attribution.
