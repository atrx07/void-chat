// functions/api/announce.js
import { verifyAdminToken } from './admin/_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    const { message, adminToken } = await request.json();

    if (!await verifyAdminToken(adminToken, env)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clean = (message || '').trim().slice(0, 300);
    if (!clean) return Response.json({ error: 'Empty message' }, { status: 400 });

    const adminUser = env.ADMIN_USERNAME || 'atrx07';
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, 'announce')`
    ).bind(adminUser, clean, now).run();

    await env.DB.prepare(
      `DELETE FROM messages WHERE id NOT IN (
        SELECT id FROM messages ORDER BY id DESC LIMIT 200
      )`
    ).run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
