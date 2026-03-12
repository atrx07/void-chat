export async function onRequestGet({ request, env }) {
  try {
    var url = new URL(request.url);
    var since = parseInt(url.searchParams.get('since') || '0', 10);
    var r = await env.DB.prepare(
      'SELECT msg_id FROM deleted_messages WHERE deleted_at > ? ORDER BY deleted_at DESC'
    ).bind(since).all();
    return Response.json({ deleted: (r.results || []).map(function(d) { return d.msg_id; }) });
  } catch (e) { return Response.json({ deleted: [] }); }
}
