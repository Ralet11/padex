const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
  console.error('[db] Error: Muti-tenant DATABASE_URL is missing in .env');
  process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  define: {
    timestamps: true, // Automatically adds createdAt and updatedAt
    underscored: true, // Use snake_case for DB columns instead of camelCase
  }
});

async function getDB() {
  try {
    // Authenticate checks if connection works
    await sequelize.authenticate();
    console.log('✅ Connection to PostgreSQL has been established successfully.');

    // Sync models to DB (In production, use migrations instead of sync)
    // await sequelize.sync({ alter: true }); // We will call this from index.js later after loading models

    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
    process.exit(1);
  }
}

module.exports = { sequelize, getDB };
