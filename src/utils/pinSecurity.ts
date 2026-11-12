/**
 * Pure security & normalization helpers for BazarBD persistence.
 * Works identically in both browser (Web Crypto API) and Node.js.
 */

const PIN_DOMAIN_SALT = 'bazarbd-pin-v1:';

export async function hashPin(pin: string): Promise<string> {
  const normalized = `${PIN_DOMAIN_SALT}${pin.trim()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback if WebCrypto subtle is unavailable
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(normalized).digest('hex');
}

export async function verifyPinHash(pin: string, expectedHash: string): Promise<boolean> {
  if (!pin || !expectedHash) return false;
  const candidateHash = await hashPin(pin);
  if (candidateHash.length !== expectedHash.length) return false;

  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function sanitizeImageUrl(url: string | undefined, categoryId: string): string {
  if (
    !url ||
    url.includes('/src/assets/images/') ||
    url.includes('unsplash.com')
  ) {
    switch (categoryId) {
      case 'cat-fish':
        return '/images/fish.jpg';
      case 'cat-rice':
        return '/images/rice.jpg';
      case 'cat-meat':
        return '/images/meat.jpg';
      case 'cat-dairy':
        return '/images/dairy.jpg';
      case 'cat-oil':
        return '/images/oil.jpg';
      case 'cat-pulses':
        return '/images/pulses.jpg';
      case 'cat-fruits':
        return '/images/fruits.jpg';
      case 'cat-spices':
        return '/images/spices.jpg';
      default:
        return '/images/vegetables.jpg';
    }
  }
  return url;
}

export function validateNewPin(newPin: string, confirmPin: string): { valid: boolean; errorBn?: string; errorEn?: string } {
  const trimmed = newPin.trim();
  if (trimmed.length < 4) {
    return {
      valid: false,
      errorBn: 'নতুন পিন কোড কমপক্ষে ৪ ডিজিট বা অক্ষরের হতে হবে!',
      errorEn: 'New PIN must be at least 4 characters!',
    };
  }
  if (trimmed.length > 32) {
    return {
      valid: false,
      errorBn: 'পিন কোড সর্বোচ্চ ৩২ অক্ষরের হতে পারবে!',
      errorEn: 'PIN cannot exceed 32 characters!',
    };
  }
  if (newPin !== confirmPin) {
    return {
      valid: false,
      errorBn: 'নতুন পিন এবং কনফার্ম পিন মিলছে না!',
      errorEn: 'New PIN and Confirm PIN do not match!',
    };
  }
  return { valid: true };
}
