function assertDemoSeedAllowed(env = process.env) {
  if (env.NODE_ENV === 'production' || env.SEED_DEMO !== 'true') {
    throw new Error('Demo seeding requires SEED_DEMO=true in a non-production environment.');
  }
  if (!env.DEMO_ADMIN_EMAIL || !env.DEMO_ADMIN_PASSWORD || env.DEMO_ADMIN_PASSWORD.length < 16) {
    throw new Error('Set DEMO_ADMIN_EMAIL and a DEMO_ADMIN_PASSWORD of at least 16 characters.');
  }
  return { email: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD };
}
module.exports = { assertDemoSeedAllowed };
