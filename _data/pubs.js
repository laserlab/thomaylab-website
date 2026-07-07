// Exposes the ORCID-synced publication list (assets/publications.json,
// updated weekly by .github/workflows/pubs.yml) as build-time data,
// deduplicated by title and grouped by year, newest first.
import { readFileSync } from "node:fs";

export default function () {
  const raw = JSON.parse(readFileSync("assets/publications.json", "utf8"));

  // The ORCID export can list the same work twice (e.g. via DOI and via
  // arXiv); keep the first occurrence of each title.
  const seen = new Set();
  const deduped = raw.filter((p) => {
    const key = p.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byYear = new Map();
  for (const p of deduped) {
    const year = p.year || "Undated";
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push({
      ...p,
      link: p.url || (p.doi ? `https://doi.org/${p.doi}` : ""),
      typeLabel: (p.type || "").replaceAll("-", " "),
    });
  }

  const years = [...byYear.keys()].sort((a, b) => String(b).localeCompare(String(a)));
  return {
    count: deduped.length,
    years: years.map((year) => ({ year, items: byYear.get(year) })),
  };
}
