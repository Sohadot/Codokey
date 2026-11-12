(function () {
  'use strict';
  // Decorative pointer ring. The system cursor is never hidden; the ring is
  // disabled for touch devices and reduced-motion users (see codokey.css).
  var curR = document.getElementById('curR');
  if (curR && window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.addEventListener('mousemove', function (e) {
      curR.style.opacity = '1';
      curR.style.left = e.clientX + 'px';
      curR.style.top = e.clientY + 'px';
    });
  }
})();
