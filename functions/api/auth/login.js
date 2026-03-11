async function hashPassword(password) {
  var encoder = new TextEncoder();
  var data = encoder.encode(password);
  var hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = (body.username || '').trim();
    var password = body.password || '';
    if (!username || !password) return Response.json({ error: 'Missing fields' }, { status: 400 });
    var hashed = await hashPassword(password);
    var user = await env.DB.prepare('SELECT username FROM users WHERE username = ? AND password_hash = ?').bind(username, hashed).first();
    if (!user) return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    var banned = await env.DB.prepare('SELECT 1 FROM banned_users WHERE username = ?').bind(username).first();
    if (banned) return Response.json({ error: 'This account has been banned' }, { status: 403 });
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
