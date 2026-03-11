export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var username = body.username;
    var subscription = body.subscription;
    if (!username || !subscription) return Response.json({ error: 'Missing fields' }, { status: 400 });
    var sub = JSON.stringify(subscription);
    await env.DB.prepare(
      'INSERT INTO push_subscriptions (username, subscription, created_at) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET subscription = excluded.subscription, created_at = excluded.created_at'
    ).bind(username, sub, Date.now()).run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
