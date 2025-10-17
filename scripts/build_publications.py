# scripts/build_publications.py
# Build a static publications JSON from ORCID to avoid CORS and speed up page loads.
#
# Output: assets/publications.json
# Usage: run locally (python scripts/build_publications.py) or via the GitHub Action.

import json
import os
import sys
import time
import urllib.request

ORCID_ID = "0000-0003-2271-6803"
OUT_JSON = "assets/publications.json"

def get(url: str, accept: str = "application/json"):
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "thomaylab-site/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def main():
    try:
        os.makedirs("assets", exist_ok=True)

        # 1) Fetch list of works (summary)
        works = json.loads(get(f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"))
        items = []

        # 2) Expand each work minimally to enrich with DOI/URL
        for group in works.get("group", []):
            summary = (group.get("work-summary") or [{}])[0]
            title = (((summary.get("title") or {}).get("title") or {}).get("value")) or "Untitled"
            year = (((summary.get("publication-date") or {}).get("year") or {}).get("value")) or ""
            wtype = summary.get("type") or ""
            url = ((summary.get("url") or {}).get("value")) or ""
            putcode = summary.get("putCode")
            doi = ""

            if putcode:
                try:
                    detail = json.loads(get(f"https://pub.orcid.org/v3.0/{ORCID_ID}/work/{putcode}"))
                    # Find a DOI among external IDs
                    for ext in detail.get("external-ids", {}).get("external-id", []):
                        if (ext.get("external-id-type", "") or "").lower() == "doi":
                            doi = (ext.get("external-id-value") or "").strip()
                            break
                    # Prefer DOI URL if no URL present
                    if not url and doi:
                        url = f"https://doi.org/{doi}"
                except Exception:
                    # Some records may fail to expand; keep the summary info
                    pass
                # Be polite to ORCID API
                time.sleep(0.05)

            items.append({
                "title": title,
                "year": str(year),
                "type": wtype,
                "doi": doi,
                "url": url
            })

        # 3) Sort newest → oldest (string years ok; empty becomes 0)
        items.sort(key=lambda x: int(x["year"] or "0"), reverse=True)

        # 4) Write JSON
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

        print(f"Wrote {OUT_JSON} with {len(items)} items")
    except Exception as e:
        print("Error building publications.json:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
