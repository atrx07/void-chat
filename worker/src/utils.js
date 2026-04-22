export function corsHeaders(env) {
  const origin = env.FRONTEND_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(data, status = 200, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

export function errorResponse(message, status = 400, env) {
  return jsonResponse({ error: message }, status, env);
}

/**
 * Extract and verify Firebase token from Authorization header.
 * Returns { uid, email, name } or null.
 */
export async function getAuthUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const { verifyFirebaseToken } = await import('./firebase-verify.js');
  const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
  if (!payload) return null;

  return {
    uid: payload.sub,
    email: payload.email || null,
    name: payload.name || payload.email?.split('@')[0] || 'user',
  };
}

/**
 * Check if the user is the admin (uid matches env.ADMIN_UID).
 */
export function isAdmin(user, env) {
  if (!user) return false;
  return user.uid === env.ADMIN_UID;
}

export function colorForName(name) {
  const COLORS = ['#e06c75','#61afef','#98c379','#e5c07b','#c678dd','#56b6c2','#d19a66','#be5046','#7ca3cc','#a8cc8c'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}
