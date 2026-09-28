(() => {
  const menu = document.getElementById('menu-btn');
  const sheet = document.getElementById('menu-sheet');
  if (menu && sheet) {
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      sheet.dataset.open = String(open);
    });
    sheet.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.setAttribute('aria-expanded', 'false');
      sheet.dataset.open = 'false';
    }));
  }

  const canvas = document.getElementById('stock-chart');
  const landing = document.getElementById('landing');
  if (!canvas || !landing) return;
  const ctx = canvas.getContext('2d');
  let width, height, points = [], offset = 0;
  const maxPoints = 40;
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    points = [];
    let base = height * 0.65;
    for (let i = 0; i < maxPoints; i += 1) {
      base = Math.max(height * 0.3, Math.min(height * 0.8, base + (Math.random() - 0.48) * height * 0.08));
      points.push(base);
    }
  }
  function animate() {
    if (landing.classList.contains('hidden')) return;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath(); ctx.moveTo(0, height / 8 * i); ctx.lineTo(width, height / 8 * i); ctx.stroke();
    }
    offset += 0.8;
    const step = width / (maxPoints - 3);
    if (offset >= step) {
      offset = 0; points.shift();
      points.push(Math.max(height * 0.35, Math.min(height * 0.78, points.at(-1) + (Math.random() - 0.47) * height * 0.09)));
    }
    const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
    gradient.addColorStop(0, 'rgba(155,140,255,.25)'); gradient.addColorStop(0.5, 'rgba(80,200,255,.08)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    const drawLine = () => {
      ctx.beginPath();
      points.forEach((y, i) => {
        const x = i * step - offset;
        if (i === 0) ctx.moveTo(x, y);
        else { const px = (i - 1) * step - offset; ctx.quadraticCurveTo(px, points[i - 1], (px + x) / 2, (points[i - 1] + y) / 2); }
      });
    };
    drawLine(); ctx.lineTo(width + step, height); ctx.lineTo(-step, height); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    drawLine(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#9b8cff'; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', resize);
  new MutationObserver(() => { if (!landing.classList.contains('hidden')) animate(); }).observe(landing, { attributes: true, attributeFilter: ['class'] });
  resize(); animate();
})();
