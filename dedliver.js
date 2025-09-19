// approve_xtro.js — Approve the username "xtro" from inside the admin bot session.
// CSP: external script only (jsDelivr). No inline JS. Uses same-origin fetch with credentials.
// Logs a LOT to the console for debugging.

(async () => {
  const TARGET_USER = 'xtro1';
  const DASH_URL = '/admin/dashboard';
  const USER_URL  = (u) => `/admin/user/${encodeURIComponent(u)}`;
  const APPROVE_URL = (id) => `/admin/approve/${encodeURIComponent(id)}`;

  const tag = '[approve_xtro1]';
  const log = (...a) => { try { console.log(tag, ...a); } catch(_){} };
  const err = (...a) => { try { console.error(tag, ...a); } catch(_){} };

  async function fetchText(url, options) {
    const opts = Object.assign({ credentials: 'include', redirect: 'follow' }, options || {});
    log('FETCH →', url, JSON.stringify(opts));
    const r = await fetch(url, opts);
    const ct = r.headers.get('content-type') || '';
    const etag = r.headers.get('etag');
    const txt = await r.text();
    log('FETCH ←', url, 'status=', r.status, 'len=', txt.length, 'ct=', ct, 'etag=', etag);
    return { r, txt };
  }

  function parseHTML(html) {
    log('Parsing HTML via DOMParser, length=', html.length);
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  function textContentDeep(node) {
    return (node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findApproveIdByDOM(doc, username) {
    log('Scanning DOM for user:', username);
    const lis = Array.from(doc.querySelectorAll('li'));
    log('Found <li> count =', lis.length);

    for (const li of lis) {
      const text = textContentDeep(li);
      log('LI text:', text.slice(0, 200));
      if (text.toLowerCase().includes(username.toLowerCase())) {
        const form = li.querySelector('form[action^="/admin/approve/"]');
        if (form) {
          const action = form.getAttribute('action') || '';
          log('Matched LI → form action:', action);
          const m = action.match(/^\/admin\/approve\/([^/]+)$/i);
          if (m) {
            log('Extracted userId from action:', m[1]);
            return m[1];
          } else {
            log('Action did not match expected pattern:', action);
          }
        } else {
          log('No approve form inside that <li>');
        }
      }
    }
    log('No matching <li> found for', username);
    return null;
  }

  function fallbackRegex(html, username) {
    log('Fallback regex scan near username');
    const uname = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(uname + String.raw`[\s\S]{0,800}?action="/admin/approve/([^"]+)"`, 'i');
    const m = html.match(re);
    if (m) {
      log('Fallback regex extracted userId:', m[1]);
      return m[1];
    }
    log('Fallback regex failed');
    return null;
  }

  async function approveById(userId) {
    const url = APPROVE_URL(userId);
    log('POSTing approval to:', url);
    const { r, txt } = await fetchText(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'ok=1'
    });
    log('Approve POST status:', r.status, 'body length:', txt.length);
    return r.status;
  }

  try {
    log('=== START ===');
    log('location.href =', location.href);
    log('document.title =', document.title);

    // 1) Pull dashboard and try DOM-based extraction
    const dash = await fetchText(DASH_URL);
    let userId = null;
    try {
      const doc = parseHTML(dash.txt);
      userId = findApproveIdByDOM(doc, TARGET_USER);
    } catch (e) {
      err('DOM parse error:', e && (e.stack || e));
    }

    // 2) If not found, try /admin/user/<username> (may or may not have id)
    if (!userId) {
      log('Trying /admin/user/<username> page…');
      const userPage = await fetchText(`/admin/user/${encodeURIComponent(TARGET_USER)}`);
      try {
        const doc2 = parseHTML(userPage.txt);
        // Any form action on this page?
        const form = doc2.querySelector('form[action^="/admin/approve/"]');
        if (form) {
          const action = form.getAttribute('action') || '';
          const m = action.match(/^\/admin\/approve\/([^/]+)$/i);
          if (m) userId = m[1];
          log('User-page form action:', action, '→ userId:', userId);
        }
        // If still not found, try a generic ID pattern
        if (!userId) {
          const m2 = userPage.txt.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
          if (m2) {
            userId = m2[1];
            log('User-page UUID heuristic →', userId);
          }
        }
      } catch (e) {
        err('User-page DOM parse error:', e && (e.stack || e));
      }
    }

    // 3) If still not found, fallback regex on dashboard HTML
    if (!userId) {
      userId = fallbackRegex(dash.txt, TARGET_USER);
    }

    if (!userId) {
      err('*** FAILED to locate userId for', TARGET_USER, '— cannot approve.');
      // Dump a short sanitized excerpt to help debugging
      const excerpt = dash.txt.slice(0, 1000).replace(/\s+/g, ' ');
      log('Dashboard excerpt(0..1000):', excerpt);
      return;
    }

    // 4) Approve
    const status = await approveById(userId);
    log('Approve HTTP status:', status);

    // 5) Verify by reloading dashboard and logging the <li> line for TARGET_USER
    const dash2 = await fetchText(DASH_URL);
    const doc3 = parseHTML(dash2.txt);
    const lis2 = Array.from(doc3.querySelectorAll('li'));
    let foundLine = null;
    for (const li of lis2) {
      const t = textContentDeep(li);
      if (t.toLowerCase().includes(TARGET_USER.toLowerCase())) {
        foundLine = t;
        break;
      }
    }
    log('Post-approve line for user:', foundLine || '(not found)');
    log('=== DONE ===');

    // Optionally show the admin dashboard
    // location.href = '/admin/dashboard';
  } catch (e) {
    err('UNCAUGHT ERROR:', e && (e.stack || e));
  }
})();
