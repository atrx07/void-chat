// functions/api/messages.js
// Handles GET (fetch messages) and POST (send message)

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, username, message, created_at
       FROM messages
       WHERE id > ?
       ORDER BY id ASC
       LIMIT 50`
    ).bind(since).all();

    return Response.json({ messages: results || [] });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { username, message } = await request.json();

    if (!username || !message) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const clean = message.trim().slice(0, 500);
    if (!clean) return Response.json({ error: 'Empty message' }, { status: 400 });

    const now = Date.now();

    // Insert new message, then delete oldest if over 200 message limit
    await env.DB.prepare(
      `INSERT INTO messages (username, message, created_at) VALUES (?, ?, ?)`
    ).bind(username, clean, now).run();

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
