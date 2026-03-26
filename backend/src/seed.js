const { Venue, Court, Slot, User } = require('./models');
const bcrypt = require('bcryptjs');
const { dateToStr } = require('./services/availability');

async function seedDatabase() {
    try {
        const courtCount = await Court.count();

        if (courtCount > 0) {
            console.log('[seeder] Database already seeded, skipping.');
            return;
        }

        console.log('[seeder] Seeding init venue and courts...');

        // Create Admin User
        const adminEmail = 'admin@padex.com';
        const [adminUser] = await User.findOrCreate({
            where: { email: adminEmail },
            defaults: {
                name: 'Super Admin',
                password: 'Padex124356879!',
                role: 'admin'
            }
        });

        const venue = await Venue.create({
            name: 'Pádel Club Central',
            address: 'Calle Falsa 123, BUE',
            phone: '+5491112345678',
            manager_id: 1 // Assuming first user exists or will be created
        });

        const courtsData = [
            {
                venue_id: venue.id,
                name: 'Cancha Central (Cristal)',
                type: 'Cristal',
                indoor: true,
                price_per_hour: 5000
            },
            {
                venue_id: venue.id,
                name: 'Cancha 2 (Muro)',
                type: 'Muro',
                indoor: false,
                price_per_hour: 3000
            },
            {
                venue_id: venue.id,
                name: 'Cancha 3 (Panorámica)',
                type: 'Cristal',
                indoor: true,
                price_per_hour: 6000
            }
        ];

        const createdCourts = await Court.bulkCreate(courtsData);

        for (const court of createdCourts) {
            // Seed today and tomorrow
            for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateStr = dateToStr(date);

                const slotsData = [
                    { court_id: court.id, date: dateStr, time: '18:00', duration: 90, price: court.price_per_hour * 1.5, is_available: true },
                    { court_id: court.id, date: dateStr, time: '19:30', duration: 90, price: court.price_per_hour * 1.5, is_available: true },
                    { court_id: court.id, date: dateStr, time: '21:00', duration: 90, price: court.price_per_hour * 1.5, is_available: true },
                ];
                await Slot.bulkCreate(slotsData);
            }
        }

        console.log('[seeder] 🎾 Seed successful!');
    } catch (err) {
        console.error('[seeder] Error:', err);
    }
}

module.exports = seedDatabase;
