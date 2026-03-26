require('dotenv').config();
const { sequelize } = require('./src/database');
const { User, Venue, Court, Slot } = require('./src/models');
const seedDatabase = require('./src/seed');

async function reset() {
  try {
    console.log('🔄 Resetting database...');
    await sequelize.sync({ force: true });
    console.log('✅ Database cleared and synced.');
    
    // Explicitly create admin to be 100% sure
    await User.create({
      name: 'Super Admin',
      email: 'admin@padex.com',
      password: 'Padex124356879!',
      role: 'admin'
    });
    console.log('🛡️ Admin user created.');

    // Run the rest of the seed if needed
    // await seedDatabase(); 

    console.log('✨ System reset complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
}

reset();
