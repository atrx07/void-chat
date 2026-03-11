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
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
