import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRENT_APP_VERSION } from './app-version';
import { shouldShowUpdate } from './update-check';

const publicVersion = JSON.parse(readFileSync('public/version.json', 'utf8')).version;

assert.equal(CURRENT_APP_VERSION, publicVersion, 'compiled app version should match public/version.json');

assert.equal(
  shouldShowUpdate('1.0.6', { version: '1.0.7', apkUrl: 'https://example.com/app.apk' }),
  true,
  'remote version above the compiled current version should show an update'
);

assert.equal(
  shouldShowUpdate('1.0.7', { version: '1.0.7', apkUrl: 'https://example.com/app.apk' }),
  false,
  'same version should not show an update'
);

assert.equal(
  shouldShowUpdate('1.0.7', { version: '1.0.6', apkUrl: 'https://example.com/app.apk' }),
  false,
  'lower remote version should not show an update'
);

assert.equal(
  shouldShowUpdate('1.0.6', { version: '1.0.7', apkUrl: '' }),
  false,
  'updates without a download URL should not show'
);

console.log('update-check tests passed');
