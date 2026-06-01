(function () {
  'use strict';

  var cur = document.getElementById('cur');
  var curR = document.getElementById('curR');
  if (cur && curR && window.matchMedia('(pointer:fine)').matches) {
    document.addEventListener('mousemove', function (e) {
      cur.style.left = e.clientX + 'px';
      cur.style.top = e.clientY + 'px';
      setTimeout(function () {
        curR.style.left = e.clientX + 'px';
        curR.style.top = e.clientY + 'px';
      }, 70);
    });
  }
})();
