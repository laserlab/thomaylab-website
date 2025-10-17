// Load prebuilt publications from assets/publications.json (built from ORCID by GitHub Action)
async function initPublications() {
  try {
    const res = await fetch("assets/publications.json", { cache: "no-store" });
    const items = await res.json();

    function renderList(el, arr) {
      el.innerHTML = "";
      for (const it of arr) {
        const li = document.createElement("li");

        const t = document.createElement("div");
        t.className = "title";
        if (it.url) {
          const a = document.createElement("a");
          a.href = it.url;
          a.rel = "noopener";
          a.textContent = it.title || "Untitled";
          t.appendChild(a);
        } else {
          t.textContent = it.title || "Untitled";
        }

        const meta = document.createElement("div");
        meta.className = "meta";
        if (it.year) {
          const s = document.createElement("span");
          s.textContent = it.year;
          meta.appendChild(s);
        }
        if (it.type) {
          const s = document.createElement("span");
          s.textContent = String(it.type).replace(/-/g, " ");
          meta.appendChild(s);
        }
        if (it.doi) {
          const a = document.createElement("a");
          a.href = `https://doi.org/${it.doi}`;
          a.textContent = `doi:${it.doi}`;
          meta.appendChild(a);
        }

        li.appendChild(t);
        li.appendChild(meta);
        el.appendChild(li);
      }
    }

    const full = document.getElementById("pubs-list");
    const prev = document.getElementById("pubs-preview-list");

    // Populate filters if present
    const yf = document.getElementById("year-filter");
    const tf = document.getElementById("type-filter");
    if (yf) {
      const years = Array.from(new Set(items.map(i => i.year).filter(Boolean))).sort((a, b) => b - a);
      years.forEach(y => {
        const o = document.createElement("option");
        o.value = y;
        o.textContent = y;
        yf.appendChild(o);
      });
    }

    const applyFilters = () => {
      const yr = yf ? yf.value : "";
      const ty = tf ? tf.value : "";
      const filtered = items.filter(i => (!yr || i.year === yr) && (!ty || i.type === ty));
      if (full) renderList(full, filtered);
    };

    if (yf) yf.addEventListener("change", applyFilters);
    if (tf) tf.addEventListener("change", applyFilters);

    if (full) renderList(full, items);
    if (prev) renderList(prev, items.slice(0, 5));
  } catch (e) {
    const el = document.getElementById("pubs-list") || document.getElementById("pubs-preview-list");
    if (el) el.innerHTML = `<li class="muted">Publications are unavailable right now.</li>`;
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", initPublications);
