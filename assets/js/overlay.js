(() => {
  'use strict';
  const clock = document.getElementById('clock');
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('en-GB', {hour12: false});
  }
  function resize() {
    const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    document.documentElement.style.setProperty('--scale', String(scale));
  }
  tick();
  resize();
  setInterval(tick, 1000);
  window.addEventListener('resize', resize);
})();
