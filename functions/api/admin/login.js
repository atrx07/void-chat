export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    var adminUser = env.ADMIN_USERNAME || 'atrx07';
    var adminPass = env.ADMIN_PASSWORD;
    if (!adminPass) return Response.json({ error: 'Admin not configured' }, { status: 500 });
    if (body.username !== adminUser || body.password !== adminPass) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    var encoder = new TextEncoder();
    var data = encoder.encode(body.username + body.password + (env.ADMIN_SECRET || 'void'));
    var hash = await crypto.subtle.digest('SHA-256', data);
    var token = Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    return Response.json({ ok: true, token: token });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
