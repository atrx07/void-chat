// Web Push with payload encryption for FCM/Chrome
async function encryptPayload(subscription, payload) {
  var sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
  var p256dh = sub.keys.p256dh;
  var auth = sub.keys.auth;

  var payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  // Decode receiver public key and auth
  function b64decode(s) {
    var b = s.replace(/-/g,'+').replace(/_/g,'/');
    while (b.length % 4) b += '=';
    return Uint8Array.from(atob(b), function(c) { return c.charCodeAt(0); });
  }

  var receiverPub = b64decode(p256dh);
  var authBytes = b64decode(auth);

  // Generate sender ECDH key pair
  var senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  var senderPubRaw = await crypto.subtle.exportKey('raw', senderKeyPair.publicKey);

  // Import receiver public key
  var receiverKey = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // Derive shared secret
  var sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKeyPair.privateKey, 256);

  // Generate salt
  var salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive PRK from auth
  var authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  var ikm = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);

  // PRK
  var prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
    ikm, 256
  );

  // CEK info
  var senderPubArr = new Uint8Array(senderPubRaw);
  var cekInfo = new Uint8Array(
    new TextEncoder().encode('Content-Encoding: aesgcm\0P-256\0').length + 2 + receiverPub.length + 2 + senderPubArr.length
  );
  var offset = 0;
  var cekLabel = new TextEncoder().encode('Content-Encoding: aesgcm\0P-256\0');
  cekInfo.set(cekLabel, offset); offset += cekLabel.length;
  cekInfo[offset++] = 0; cekInfo[offset++] = receiverPub.length;
  cekInfo.set(receiverPub, offset); offset += receiverPub.length;
  cekInfo[offset++] = 0; cekInfo[offset++] = senderPubArr.length;
  cekInfo.set(senderPubArr, offset);

  // Nonce info
  var nonceInfo = new Uint8Array(
    new TextEncoder().encode('Content-Encoding: nonce\0P-256\0').length + 2 + receiverPub.length + 2 + senderPubArr.length
  );
  offset = 0;
  var nonceLabel = new TextEncoder().encode('Content-Encoding: nonce\0P-256\0');
  nonceInfo.set(nonceLabel, offset); offset += nonceLabel.length;
  nonceInfo[offset++] = 0; nonceInfo[offset++] = receiverPub.length;
  nonceInfo.set(receiverPub, offset); offset += receiverPub.length;
  nonceInfo[offset++] = 0; nonceInfo[offset++] = senderPubArr.length;
  nonceInfo.set(senderPubArr, offset);

  var prk = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits']);
  var cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: cekInfo }, prk, 128);
  var nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfo }, prk, 96);

  // Encrypt
  var cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  var padded = new Uint8Array(payloadBytes.length + 2);
  padded[0] = 0; padded[1] = 0;
  padded.set(payloadBytes, 2);

  var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, padded);

  // Build body: salt (16) + rs (4) + keyid_len (1) + sender_pub (65) + ciphertext
  var rs = 4096;
  var body = new Uint8Array(16 + 4 + 1 + senderPubArr.length + encrypted.byteLength);
  offset = 0;
  body.set(salt, offset); offset += 16;
  body[offset++] = (rs >> 24) & 0xff;
  body[offset++] = (rs >> 16) & 0xff;
  body[offset++] = (rs >> 8) & 0xff;
  body[offset++] = rs & 0xff;
  body[offset++] = senderPubArr.length;
  body.set(senderPubArr, offset); offset += senderPubArr.length;
  body.set(new Uint8Array(encrypted), offset);

  return { body: body, salt: salt, senderPub: senderPubArr };
}

async function buildVapidJWT(endpoint, vapidPublic, vapidPrivate) {
  var url = new URL(endpoint);
  var audience = url.protocol + '//' + url.host;
  var now = Math.floor(Date.now() / 1000);
  var exp = now + 43200;
  var header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  var payload = btoa(JSON.stringify({ aud: audience, exp: exp, sub: 'mailto:admin@void.chat' })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  var unsigned = header + '.' + payload;

  // Import private key as JWK (raw format not supported for ECDSA signing in Workers)
  // vapidPublic is 65-byte uncompressed P-256 point: 0x04 + x(32) + y(32)
  function b64urlDecode(s) {
    var b = s.replace(/-/g,'+').replace(/_/g,'/');
    while (b.length % 4) b += '=';
    return Uint8Array.from(atob(b), function(c) { return c.charCodeAt(0); });
  }
  function b64urlEncode(arr) {
    return btoa(String.fromCharCode.apply(null, arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  var pubBytes = b64urlDecode(vapidPublic); // 65 bytes
  var x = b64urlEncode(pubBytes.slice(1, 33));
  var y = b64urlEncode(pubBytes.slice(33, 65));
  var jwk = { kty: 'EC', crv: 'P-256', x: x, y: y, d: vapidPrivate, key_ops: ['sign'] };
  var key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  var sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  var sigB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return unsigned + '.' + sigB64;
}

async function sendPush(subscription, title, body, vapidPublic, vapidPrivate) {
  try {
    var sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
    var jwt = await buildVapidJWT(sub.endpoint, vapidPublic, vapidPrivate);
    var encrypted = await encryptPayload(sub, { title: title, body: body });
    function b64encode(arr) {
      return btoa(String.fromCharCode.apply(null, arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }
    var res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'vapid t=' + jwt + ', k=' + vapidPublic,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': 'salt=' + b64encode(encrypted.salt),
        'Crypto-Key': 'dh=' + b64encode(encrypted.senderPub) + ';vapid="' + vapidPublic + '"',
        'TTL': '60'
      },
      body: encrypted.body
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
            return sendPush(s.subscription, username + ' in void.chat', clean.slice(0, 100), vapidPublic, vapidPrivate);
          });
          await Promise.allSettled(sends);
        }
      } catch (e) {}
    }
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
