export async function verifyFirebaseToken(idToken, projectId) {
  if (!idToken || !projectId) return null;

  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) return null;
    if (payload.iat > now + 60) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub) return null;

    const keyRes = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
      { cf: { cacheEverything: true, cacheTtl: 3600 } }
    );

    if (!keyRes.ok) return null;

    const jwks = await keyRes.json();
    const jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1])
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

function base64UrlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '='));
}

function base64UrlToBytes(str) {
  return Uint8Array.from(base64UrlDecode(str), c => c.charCodeAt(0));
}
