const { Venue, Court, Slot, User } = require('./models');
const { dateToStr } = require('./services/availability');

async function seedDatabase() {
    try {
        const courtCount = await Court.count();

        if (courtCount > 0) {
            console.log('[seeder] Database already seeded, skipping.');
            return;
        }

        console.log('[seeder] Seeding init venue and courts...');

        await User.findOrCreate({
            where: { email: 'admin@padex.com' },
            defaults: {
                name: 'Super Admin',
                password: 'Padex124356879!',
                role: 'admin'
            }
        });

        const venue = await Venue.create({
            name: 'Padel Club Central',
            address: 'Calle Falsa 123, BUE',
            phone: '+5491112345678',
            price_per_slot: 12000,
            services: ['wifi', 'vestuario', 'estacionamiento'],
            manager_id: 1
        });

        const createdCourts = await Court.bulkCreate([
            {
                venue_id: venue.id,
                name: 'Cancha Central (Cristal)',
                type: 'Cristal',
                surface: 'sintetico',
                enclosure: 'cubierta'
            },
            {
                venue_id: venue.id,
                name: 'Cancha 2 (Muro)',
                type: 'Muro',
                surface: 'cemento',
                enclosure: 'descubierta'
            },
            {
                venue_id: venue.id,
                name: 'Cancha 3 (Panoramica)',
                type: 'Cristal',
                surface: 'parquet',
                enclosure: 'cubierta'
            }
        ]);

        for (const court of createdCourts) {
            for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateStr = dateToStr(date);

                await Slot.bulkCreate([
                    { court_id: court.id, date: dateStr, time: '18:00', duration: 90, price: venue.price_per_slot, is_available: true },
                    { court_id: court.id, date: dateStr, time: '19:30', duration: 90, price: venue.price_per_slot, is_available: true },
                    { court_id: court.id, date: dateStr, time: '21:00', duration: 90, price: venue.price_per_slot, is_available: true },
                ]);
            }
        }

        console.log('[seeder] Seed successful!');
    } catch (err) {
        console.error('[seeder] Error:', err);
    }
}

module.exports = seedDatabase;
