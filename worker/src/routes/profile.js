import { getAuthUser, jsonResponse, errorResponse } from '../utils.js';

const ALLOWED_COLORS = [
  '#e06c75','#61afef','#98c379','#e5c07b','#c678dd',
  '#56b6c2','#d19a66','#be5046','#7ca3cc','#a8cc8c',
];

export async function handleProfile(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('Unauthorized', 401, env);

  // GET — return current profile
  if (request.method === 'GET') {
    try {
      const row = await env.DB.prepare(
        'SELECT display_name, name_color FROM user_profiles WHERE uid = ?'
      ).bind(user.uid).first();
      return jsonResponse({
        display_name: row?.display_name || user.name,
        name_color:   row?.name_color   || null,
      }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  // POST — update display name and/or color
  if (request.method === 'POST') {
    try {
      const body = await request.json();

      let display_name = (body.display_name || '').trim().slice(0, 32);
      const name_color = ALLOWED_COLORS.includes(body.name_color) ? body.name_color : null;

      if (display_name.length < 2) return errorResponse('Name too short (min 2 chars)', 400, env);

      // Upsert profile row
      await env.DB.prepare(`
        INSERT INTO user_profiles (uid, display_name, name_color, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET
          display_name = excluded.display_name,
          name_color   = excluded.name_color,
          updated_at   = excluded.updated_at
      `).bind(user.uid, display_name, name_color, Date.now()).run();

      return jsonResponse({ ok: true, display_name, name_color }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  return errorResponse('Method not allowed', 405, env);
}
