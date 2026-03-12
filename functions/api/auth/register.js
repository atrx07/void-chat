async function hashPassword(password) {
  var encoder = new TextEncoder();
  var data = encoder.encode(password);
  var hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = (body.username || '').trim().slice(0, 30);
    var password = body.password || '';
    if (!username || !password) return Response.json({ error: 'Missing fields' }, { status: 400 });
    if (username.length < 3) return Response.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    if (/\s/.test(username)) return Response.json({ error: 'Username cannot contain spaces' }, { status: 400 });
    var banned = await env.DB.prepare('SELECT 1 FROM banned_users WHERE username = ?').bind(username).first();
    if (banned) return Response.json({ error: 'This username is not available' }, { status: 400 });
    var existing = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
    if (existing) return Response.json({ error: 'Username already taken' }, { status: 400 });
    var hashed = await hashPassword(password);
    await env.DB.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').bind(username, hashed, Date.now()).run();
    // Welcome announcement
    await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind('system', username + ' just joined the chat.', Date.now(), 'system').run();
    await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
