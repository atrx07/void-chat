export async function onRequestGet({ env }) {
  try {
    var cutoff = Date.now() - 30000; // 30 seconds
    var r = await env.DB.prepare(
      'SELECT username FROM online_users WHERE last_seen > ? ORDER BY last_seen DESC'
    ).bind(cutoff).all();
    return Response.json({ users: (r.results || []).map(function(u) { return u.username; }) });
  } catch (e) { return Response.json({ users: [] }); }
}

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = body.username;
    if (!username) return Response.json({ error: 'Missing username' }, { status: 400 });
    var now = Date.now();
    await env.DB.prepare(
      'INSERT INTO online_users (username, last_seen) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET last_seen = excluded.last_seen'
    ).bind(username, now).run();
    // Clean up stale entries older than 60s
    await env.DB.prepare('DELETE FROM online_users WHERE last_seen < ?').bind(now - 60000).run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
