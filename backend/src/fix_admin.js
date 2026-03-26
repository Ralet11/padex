require('dotenv').config();
const { User, sequelize } = require('./models');

async function fixAdmin() {
    try {
        console.log('Script started...');
        await sequelize.authenticate();
        console.log('Database connected.');
        
        await sequelize.sync({ force: true });
        console.log('Database force-synced (tables recreated).');
        
        const user = await User.findOne({ where: { email: 'admin@padex.com' } });
        if (!user) {
            console.log('Admin user not found. Seeding...');
            await User.create({
                name: 'Super Admin',
                email: 'admin@padex.com',
                password: 'Padex124356879!',
                role: 'admin'
            });
            console.log('Admin created.');
        } else {
            console.log('Updating existing admin password...');
            user.password = 'Padex124356879!';
            await user.save();
            console.log('Admin password updated.');
        }
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
}

fixAdmin();
