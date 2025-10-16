// ORCID-powered publications rendering
// ORCID iD for this site owner:
const ORCID_ID = "0000-0003-2271-6803";

async function fetchWorks() {
  const url = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Failed to fetch ORCID works");
  return res.json();
}

function workSummaryToItem(group) {
  // Pick the first summary; ORCID groups versions under 'group'
  const s = group["work-summary"]?.[0];
  if (!s) return null;
  const title = s?.title?.title?.value || "Untitled";
  const year = s?.["publication-date"]?.year?.value || "";
  const type = s?.type || "";
  const url = s?.url?.value || "";
  const putCode = s?.putCode;

  return { title, year, type, url, putCode };
}

async function fetchDetailedWork(putCode) {
  // Fetch a single work to get external identifiers (like DOI)
  const url = `https://pub.orcid.org/v3.0/${ORCID_ID}/work/${putCode}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

function renderList(listEl, items) {
  listEl.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.className = "title";
    if (it.url) {
      const a = document.createElement("a");
      a.href = it.url;
      a.textContent = it.title;
      a.rel = "noopener";
      title.appendChild(a);
    } else {
      title.textContent = it.title;
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    if (it.year) {
      const span = document.createElement("span");
      span.textContent = it.year;
      meta.appendChild(span);
    }
    if (it.type) {
      const span = document.createElement("span");
      span.textContent = it.type.replace(/-/g, " ");
      meta.appendChild(span);
    }
    if (it.doi) {
      const span = document.createElement("span");
      const a = document.createElement("a");
      a.href = `https://doi.org/${it.doi}`;
      a.textContent = `doi:${it.doi}`;
      meta.appendChild(a);
    }

    li.appendChild(title);
    li.appendChild(meta);
    listEl.appendChild(li);
  }
}

async function enhanceWithDOIs(items) {
  // Fetch detailed metadata in parallel (bounded) to find DOIs
  const concurrency = 6;
  const queue = items.slice();
  const running = new Set();

  async function worker() {
    while (queue.length) {
      const it = queue.shift();
      if (!it || !it.putCode) continue;
      const detail = await fetchDetailedWork(it.putCode);
      if (detail?.["external-ids"]?.["external-id"]) {
        const ids = detail["external-ids"]["external-id"];
        const doi = ids.find(x => (x["external-id-type"] || "").toLowerCase() === "doi");
        if (doi?.["external-id-value"]) {
          it.doi = doi["external-id-value"];
          if (!it.url) it.url = `https://doi.org/${it.doi}`;
        }
      }
    }
  }

  for (let i = 0; i < concurrency; i++) running.add(worker());
  await Promise.all(running);
  return items;
}

async function initPublications() {
  try {
    const data = await fetchWorks();
    const groups = data.group || [];
    let items = groups.map(workSummaryToItem).filter(Boolean);

    // Sort newest first
    items.sort((a, b) => (parseInt(b.year || "0") - parseInt(a.year || "0")));

    // Enhance with DOIs on the publications page (not on the lightweight preview)
    const fullList = document.getElementById("pubs-list");
    if (fullList) {
      // Build year options
      const years = Array.from(new Set(items.map(it => it.year).filter(Boolean))).sort((a,b)=>b-a);
      const yearFilter = document.getElementById("year-filter");
      for (const y of years) {
        const opt = document.createElement("option");
        opt.value = y; opt.textContent = y;
        yearFilter.appendChild(opt);
      }

      // Add filtering
      const typeFilter = document.getElementById("type-filter");
      function applyFilters() {
        const ty = typeFilter.value;
        const yr = yearFilter.value;
        const filtered = items.filter(it => (!ty || it.type === ty) && (!yr || it.year === yr));
        renderList(fullList, filtered);
      }
      typeFilter.addEventListener("change", applyFilters);
      yearFilter.addEventListener("change", applyFilters);

      // Fetch DOIs and render
      items = await enhanceWithDOIs(items);
      renderList(fullList, items);
    }

    // Lightweight preview (top 5)
    const preview = document.getElementById("pubs-preview-list");
    if (preview) {
      renderList(preview, items.slice(0, 5));
    }
  } catch (e) {
    const fullList = document.getElementById("pubs-list") || document.getElementById("pubs-preview-list");
    if (fullList) {
      fullList.innerHTML = `<li class="muted">Could not load publications from ORCID. Please try again later.</li>`;
    }
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", initPublications);
