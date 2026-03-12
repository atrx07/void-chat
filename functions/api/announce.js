import { verifyAdminToken } from './admin/_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var now = Date.now();

    // System announcements (join/ban/unban) - no auth needed, internal only
    if (body.type === 'system') {
      var clean = (body.message || '').trim().slice(0, 300);
      if (!clean) return Response.json({ error: 'Empty message' }, { status: 400 });
      await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind('system', clean, now, 'system').run();
      await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();
      return Response.json({ ok: true });
    }

    // Admin announcements
    if (!await verifyAdminToken(body.adminToken, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    var msg = (body.message || '').trim().slice(0, 300);
    if (!msg) return Response.json({ error: 'Empty message' }, { status: 400 });
    var adminUser = env.ADMIN_USERNAME || 'atrx07';
    await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind(adminUser, msg, now, 'announce').run();
    await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
