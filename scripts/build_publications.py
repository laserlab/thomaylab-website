# scripts/build_publications.py
import json, os, sys, urllib.request

ORCID_ID = "0000-0003-2271-6803"
OUT_JSON = "assets/publications.json"

def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"Accept": accept})
    with urllib.request.urlopen(req) as r:
        return r.read().decode("utf-8")

def main():
    works = json.loads(get(f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"))
    items = []
    for g in works.get("group", []):
        s = g.get("work-summary", [{}])[0]
        title = (((s.get("title") or {}).get("title") or {}).get("value")) or "Untitled"
        year = (((s.get("publication-date") or {}).get("year") or {}).get("value")) or ""
        wtype = s.get("type") or ""
        url = ((s.get("url") or {}).get("value")) or ""
        put = s.get("putCode")
        doi = ""
        if put:
            # look up detailed work for DOI
            try:
                work = json.loads(get(f"https://pub.orcid.org/v3.0/{ORCID_ID}/work/{put}"))
                for ext in work.get("external-ids", {}).get("external-id", []):
                    if (ext.get("external-id-type","").lower() == "doi"):
                        doi = ext.get("external-id-value","")
                        if not url: url = f"https://doi.org/{doi}"
                        break
            except Exception:
                pass
        items.append({"title": title, "year": str(year), "type": wtype, "doi": doi, "url": url})
    # Sort newest first
    items.sort(key=lambda x: int(x["year"] or "0"), reverse=True)
    os.makedirs("assets", exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT_JSON} with {len(items)} items")

if __name__ == "__main__":
    main()
