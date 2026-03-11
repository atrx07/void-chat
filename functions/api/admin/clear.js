import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    await env.DB.prepare('DELETE FROM messages').run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
