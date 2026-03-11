export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = body.username;
    if (!username) return Response.json({ error: 'Missing username' }, { status: 400 });

    var vapidPublic = env.VAPID_PUBLIC;
    var vapidPrivate = env.VAPID_PRIVATE;
    if (!vapidPublic || !vapidPrivate) return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });

    var row = await env.DB.prepare('SELECT subscription FROM push_subscriptions WHERE username = ?').bind(username).first();
    if (!row) return Response.json({ error: 'No subscription found for ' + username }, { status: 404 });

    var sub = JSON.parse(row.subscription);

    // Build VAPID JWT
    var url = new URL(sub.endpoint);
    var audience = url.protocol + '//' + url.host;
    var now = Math.floor(Date.now() / 1000);
    var exp = now + 43200;
    var header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var payload = btoa(JSON.stringify({ aud: audience, exp: exp, sub: 'mailto:admin@void.chat' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var unsigned = header + '.' + payload;

    var rawPriv = Uint8Array.from(atob(vapidPrivate.replace(/-/g,'+').replace(/_/g,'/')), function(c) { return c.charCodeAt(0); });

    var key;
    var keyError = null;
    try {
      key = await crypto.subtle.importKey(
        'raw', rawPriv,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
      );
    } catch (e) {
      keyError = e.message;
    }

    if (keyError) return Response.json({ error: 'Key import failed: ' + keyError, privKeyLength: rawPriv.length });

    var sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
    var sigB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var jwt = unsigned + '.' + sigB64;

    var pushRes = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'vapid t=' + jwt + ', k=' + vapidPublic,
        'TTL': '60',
        'Content-Length': '0'
      }
    });

    var pushBody = await pushRes.text();
    return Response.json({
      ok: pushRes.status === 201 || pushRes.status === 200,
      status: pushRes.status,
      response: pushBody,
      endpoint: sub.endpoint.slice(0, 50) + '...'
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
