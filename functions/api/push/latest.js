export async function onRequestGet({ env }) {
  try {
    var r = await env.DB.prepare(
      'SELECT id, username, message FROM messages ORDER BY id DESC LIMIT 1'
    ).first();
    if (!r) return Response.json({ id: 0, username: 'void.chat', message: 'new message' });
    return Response.json({ id: r.id, username: r.username, message: r.message });
  } catch (e) {
    return Response.json({ id: 0, username: 'void.chat', message: 'new message' });
  }
}
