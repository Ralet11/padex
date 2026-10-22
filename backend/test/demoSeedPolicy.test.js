const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDemoSeedAllowed } = require('../src/services/demoSeedPolicy');
const demo = { NODE_ENV: 'development', SEED_DEMO: 'true', DEMO_ADMIN_EMAIL: 'demo@example.test', DEMO_ADMIN_PASSWORD: 'test-only-not-an-account-password' };
test('demo policy requires explicit opt-in', () => {
  assert.throws(() => assertDemoSeedAllowed({ ...demo, SEED_DEMO: undefined }));
  assert.throws(() => assertDemoSeedAllowed({ ...demo, SEED_DEMO: 'false' }));
});
test('production cannot opt into demo seed', () => assert.throws(() => assertDemoSeedAllowed({ ...demo, NODE_ENV: 'production' })));
test('demo credentials are required and cannot be short', () => {
  assert.throws(() => assertDemoSeedAllowed({ ...demo, DEMO_ADMIN_EMAIL: '' }));
  assert.throws(() => assertDemoSeedAllowed({ ...demo, DEMO_ADMIN_PASSWORD: 'short' }));
});
test('isolated demo returns caller supplied credentials', () => assert.equal(assertDemoSeedAllowed(demo).email, demo.DEMO_ADMIN_EMAIL));
