# Academic Website (Thomas May)

This is a the static site for the Thomay lab (University at Buffalo), designed for maintenance via GitHub Pages and automatic publication listings from ORCID.

## How to use

1. **Edit content** in `index.html` (bio/news/teaching) and `publications.html` (no content edits needed; it's populated from ORCID).
2. **ORCID** is set to `0000-0003-2271-6803` in `assets/publications.js`. Update if needed.
3. **Deploy** by committing and pushing to your GitHub repository. If using GitHub Pages (Branch: `main`, Folder: `/`), it will publish automatically.

## Structure

```
.
├── index.html
├── publications.html
├── assets
│   ├── style.css
│   └── publications.js
└── README.md
```

## Notes
- Publications are fetched client-side from ORCID’s public API. If you prefer build-time generation (no client JS), create a small script that fetches ORCID JSON and writes static HTML, then run it with a GitHub Action on a schedule.
- Typography and layout use a single lightweight CSS file—no frameworks required.
