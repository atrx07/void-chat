/**
 * Verifies a Firebase ID token using Firebase's public keys.
 * Returns the decoded payload or null if invalid.
 */
export async function verifyFirebaseToken(idToken, projectId) {
  if (!idToken) return null;

  try {
    // Fetch Firebase public keys
    const keyRes = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { cf: { cacheEverything: true, cacheTtl: 3600 } }
    );
    if (!keyRes.ok) return null;
    const keys = await keyRes.json();

    // Decode JWT header to get kid
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const kid = header.kid;
    if (!kid || !keys[kid]) return null;

    // Import the public key (PEM cert -> CryptoKey)
    const certPem = keys[kid];
    const pemBody = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');
    const certDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      extractPublicKeyFromCert(certDer),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature
    const signedPart = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, signedPart);
    if (!valid) return null;

    // Decode and validate claims
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) return null;
    if (payload.iat > now + 60) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Extracts the SubjectPublicKeyInfo from an X.509 certificate DER buffer.
 * Walks the ASN.1 structure to find the BIT STRING containing the public key.
 */
function extractPublicKeyFromCert(derBuffer) {
  // ASN.1 DER parser - finds SubjectPublicKeyInfo in X.509 cert
  const bytes = new Uint8Array(derBuffer);
  let pos = 0;

  function readLength() {
    let len = bytes[pos++];
    if (len & 0x80) {
      const numBytes = len & 0x7f;
      len = 0;
      for (let i = 0; i < numBytes; i++) {
        len = (len << 8) | bytes[pos++];
      }
    }
    return len;
  }

  function skipTag() {
    pos++; // skip tag
    const len = readLength();
    return len;
  }

  function enterSequence() {
    pos++; // SEQUENCE tag
    readLength();
  }

  // Certificate ::= SEQUENCE { tbsCertificate TBSCertificate, ... }
  enterSequence(); // Certificate
  enterSequence(); // TBSCertificate

  // Skip version, serialNumber, signature, issuer, validity, subject
  // version [0] EXPLICIT (optional)
  if (bytes[pos] === 0xa0) {
    const len = skipTag();
    pos += len;
  }
  // serialNumber
  skipTag(); pos += readLengthAt(pos - readLengthBytes(bytes[pos - 1]) - 1);

  // Properly skip fields by reading actual content
  // Let's use a cleaner approach - find SubjectPublicKeyInfo by looking for OID
  // Reset and search for the RSA or EC OID pattern
  pos = 0;

  // Find SubjectPublicKeyInfo - look for the sequence containing algorithm OID
  // RSA: 2a 86 48 86 f7 0d 01 01 01 (1.2.840.113549.1.1.1)
  const rsaOid = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];

  for (let i = 0; i < bytes.length - rsaOid.length; i++) {
    let found = true;
    for (let j = 0; j < rsaOid.length; j++) {
      if (bytes[i + j] !== rsaOid[j]) { found = false; break; }
    }
    if (found) {
      // Found OID, SubjectPublicKeyInfo SEQUENCE starts before the AlgorithmIdentifier SEQUENCE
      // Go back to find the SEQUENCE tag
      let spkiStart = i - 2; // back past OID tag (06) and length byte
      while (spkiStart > 0 && bytes[spkiStart] !== 0x30) spkiStart--;
      // Now parse SPKI length
      let spkiPos = spkiStart + 1;
      let spkiLen = bytes[spkiPos++];
      if (spkiLen & 0x80) {
        const nb = spkiLen & 0x7f;
        spkiLen = 0;
        for (let k = 0; k < nb; k++) spkiLen = (spkiLen << 8) | bytes[spkiPos++];
      }
      return bytes.slice(spkiStart, spkiPos + spkiLen).buffer;
    }
  }

  throw new Error('SubjectPublicKeyInfo not found in certificate');
}

function readLengthAt(pos) { return 0; }
function readLengthBytes(b) { return (b & 0x80) ? (b & 0x7f) : 0; }
