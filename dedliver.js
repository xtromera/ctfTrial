// approve.js — runs inside http://localhost:3001/admin/message/<username> as admin (puppeteer bot)
(async () => {
  try {
    
   
    await fetch(`/admin/approve/xtro`, {
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
