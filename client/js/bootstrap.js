(() => {
  try {
    const stored = localStorage.getItem('stock-analyzer-theme');
    document.documentElement.classList.toggle('dark', stored ? stored === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches);
  } catch { document.documentElement.classList.add('dark'); }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('intro');
    setTimeout(() => document.documentElement.classList.remove('intro', 'intro-play'), 5000);
  }
})();
