async function sendVapidPush(endpoint, publicKeyB64, privateKeyB64) {
  try {
    var url = new URL(endpoint);
    var audience = url.protocol + '//' + url.host;
    var now = Math.floor(Date.now() / 1000);
    var exp = now + 43200;

    var header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var payload = btoa(JSON.stringify({ aud: audience, exp: exp, sub: 'mailto:admin@void.chat' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var unsigned = header + '.' + payload;

    // Import raw private key (32 bytes)
    var rawPriv = Uint8Array.from(atob(privateKeyB64.replace(/-/g,'+').replace(/_/g,'/')), function(c) { return c.charCodeAt(0); });
    var key = await crypto.subtle.importKey(
      'raw', rawPriv,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );

    var sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsigned)
    );
    var sigB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var jwt = unsigned + '.' + sigB64;

    var res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'vapid t=' + jwt + ', k=' + publicKeyB64,
        'TTL': '60',
        'Content-Length': '0'
      }
    });
    return res.status;
  } catch (e) { return 0; }
}

export async function onRequestGet({ request, env }) {
  var url = new URL(request.url);
  var since = parseInt(url.searchParams.get('since') || '0', 10);
  try {
    var r = await env.DB.prepare(
      'SELECT id, username, message, created_at, type FROM messages WHERE id > ? ORDER BY id ASC LIMIT 50'
    ).bind(since).all();
    return Response.json({ messages: r.results || [] });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = body.username;
    var message = body.message;
    if (!username || !message) return Response.json({ error: 'Missing fields' }, { status: 400 });
    var clean = message.trim().slice(0, 500);
    if (!clean) return Response.json({ error: 'Empty message' }, { status: 400 });
    var banned = await env.DB.prepare('SELECT 1 FROM banned_users WHERE username = ?').bind(username).first();
    if (banned) return Response.json({ error: 'You are banned' }, { status: 403 });
    var now = Date.now();
    await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind(username, clean, now, 'chat').run();
    await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();

    var vapidPublic = env.VAPID_PUBLIC;
    var vapidPrivate = env.VAPID_PRIVATE;
    if (vapidPublic && vapidPrivate) {
      try {
        var subs = await env.DB.prepare('SELECT subscription FROM push_subscriptions WHERE username != ?').bind(username).all();
        if (subs.results && subs.results.length > 0) {
          var sends = subs.results.map(function(s) {
            var sub = JSON.parse(s.subscription);
            return sendVapidPush(sub.endpoint, vapidPublic, vapidPrivate);
          });
          await Promise.allSettled(sends);
        }
      } catch (e) {}
    }
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
