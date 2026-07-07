// Shared site behavior: footer year + theme switcher.
// Both blocks guard on element existence so the script is safe on
// pages that omit the corresponding markup (e.g. worldcup has no switcher).

// Year footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Theme switcher
(function() {
  const STORAGE_KEY = 'thomay-lab-theme';
  const themeSwitcher = document.getElementById('theme-switcher');
  if (!themeSwitcher) return;
  const themeBtn = themeSwitcher.querySelector('.theme-switcher-btn');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeOptions = themeDropdown.querySelectorAll('button');

  // Load saved theme or default
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'default';
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Update active state in dropdown
    themeOptions.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-theme') === theme) {
        btn.classList.add('active');
      }
    });
  }

  // Toggle dropdown
  themeBtn.addEventListener('click', () => {
    const isOpen = themeDropdown.style.display !== 'none';
    themeDropdown.style.display = isOpen ? 'none' : 'block';
  });

  // Theme selection
  themeOptions.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const theme = btn.getAttribute('data-theme');
      setTheme(theme);
      themeDropdown.style.display = 'none';
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!themeSwitcher.contains(e.target)) {
      themeDropdown.style.display = 'none';
    }
  });

  // Init on load
  initTheme();
})();
