export async function onRequestPost({ request, env }) {
try {
var body = await request.json();
var username = body.username;
if (!username) return Response.json({ error: ‘Missing username’ }, { status: 400 });
await env.DB.prepare(‘DELETE FROM push_subscriptions WHERE username = ?’).bind(username).run();
return Response.json({ ok: true });
} catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
