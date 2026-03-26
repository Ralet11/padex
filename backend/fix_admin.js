const { User, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function fixAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        // The hook will hash this, so we provide PLAIN TEXT
        const result = await User.update(
            { password: 'Padex124356879!' },
            { where: { email: 'admin@padex.com' } }
        );
        
        console.log('Admin password updated successfully:', result);
        process.exit(0);
    } catch (err) {
        console.error('Error fixing admin:', err);
        process.exit(1);
    }
}

fixAdmin();
