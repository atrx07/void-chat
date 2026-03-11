export async function verifyAdminToken(token, env) {
  if (!token) return false;
  var adminUser = env.ADMIN_USERNAME || 'atrx07';
  var adminPass = env.ADMIN_PASSWORD;
  if (!adminPass) return false;
  var encoder = new TextEncoder();
  var data = encoder.encode(adminUser + adminPass + (env.ADMIN_SECRET || 'void'));
  var hash = await crypto.subtle.digest('SHA-256', data);
  var expected = Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  return token === expected;
}
