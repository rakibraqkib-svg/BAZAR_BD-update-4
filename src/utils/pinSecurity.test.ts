import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPinHash, sanitizeImageUrl, validateNewPin } from './pinSecurity';

test('hashPin produces deterministic 64-char hex SHA-256 hash', async () => {
  const h1 = await hashPin('1234');
  const h2 = await hashPin(' 1234 ');
  const h3 = await hashPin('9876');

  assert.equal(h1.length, 64);
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('verifyPinHash correctly verifies matching and non-matching PINs', async () => {
  const customHash = await hashPin('5588');
  assert.equal(await verifyPinHash('5588', customHash), true);
  assert.equal(await verifyPinHash('1234', customHash), false);
  assert.equal(await verifyPinHash('', customHash), false);
});

test('validateNewPin enforces length and confirmation match', () => {
  assert.equal(validateNewPin('123', '123').valid, false);
  assert.equal(validateNewPin('5678', '5679').valid, false);
  assert.equal(validateNewPin('5678', '5678').valid, true);
});

test('sanitizeImageUrl migrates legacy /src/assets paths and preserves custom uploads', () => {
  assert.equal(
    sanitizeImageUrl('/src/assets/images/old.jpg', 'cat-fish'),
    '/images/fish.jpg'
  );
  assert.equal(
    sanitizeImageUrl('https://images.unsplash.com/photo-123', 'cat-oil'),
    '/images/oil.jpg'
  );
  assert.equal(
    sanitizeImageUrl('data:image/jpeg;base64,/9j/4AAQ', 'cat-veg'),
    'data:image/jpeg;base64,/9j/4AAQ'
  );
});
