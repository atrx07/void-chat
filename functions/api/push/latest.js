export async function onRequestGet({ env }) {
  try {
    var r = await env.DB.prepare(
      'SELECT username, message FROM messages ORDER BY id DESC LIMIT 1'
    ).first();
    if (!r) return Response.json({ username: 'void.chat', message: 'new message' });
    return Response.json({ username: r.username, message: r.message });
  } catch (e) {
    return Response.json({ username: 'void.chat', message: 'new message' });
  }
}
