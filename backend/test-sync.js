const { Court, Slot, sequelize } = require('./src/models');
const SyncWorker = require('./src/services/SyncWorker');

async function testSync() {
    try {
        console.log('--- Testing Sync System ---');
        
        // 1. Create a dummy court with scraping config
        // We'll use a local file-based strategy if we had more time, but for now
        // let's just mock the scrape result inside SyncWorker or just verify the call flow.
        
        const [court, created] = await Court.findOrCreate({
            where: { name: 'Cancha Test Scraping' },
            defaults: {
                address: 'Calle Falsa 123',
                integration_type: 'scraping',
                integration_config: {
                    url: 'https://example-padel-booking.com', // Dummy URL
                    strategy: 'generic-table',
                    slotSelector: '.slot',
                    timeSelector: '.time',
                    priceSelector: '.price'
                }
            }
        });

        console.log(`Court created/found: ${court.name} (ID: ${court.id})`);

        // 2. Manually trigger the sync for this court
        // Note: This will actually try to launch puppeteer to the dummy URL.
        // In a real environment we would mock ScraperService.scrapeCourt.
        console.log('Running sync worker...');
        await SyncWorker.runSync();

        // 3. Check slots
        const slots = await Slot.findAll({ where: { court_id: court.id } });
        console.log(`Total slots found for court: ${slots.length}`);
        
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await sequelize.close();
    }
}

testSync();
