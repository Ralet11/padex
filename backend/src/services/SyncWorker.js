const cron = require('node-cron');
const { Court, Slot } = require('../models');
const ScraperService = require('./ScraperService');
const { dateToStr } = require('./availability');

/**
 * SyncWorker orchestrates periodic synchronization of external court data.
 */
class SyncWorker {
    /**
     * Initializes the background cron jobs.
     */
    static init() {
        console.log('[SyncWorker] Initializing sync worker (Frequency: hourly for demo)...');
        
        // Every hour (0 * * * *)
        // For testing purposes, you could change this to '*/1 * * * *' (every minute)
        cron.schedule('0 * * * *', () => {
            this.runSync().catch(err => console.error('[SyncWorker] Error during automatic sync:', err));
        });

        // Trigger an initial sync after a short delay
        setTimeout(() => {
            console.log('[SyncWorker] Triggering initial startup sync...');
            this.runSync().catch(err => console.error('[SyncWorker] Error during initial sync:', err));
        }, 5000);
    }

    /**
     * Main sync logic: finds courts with integrations and syncs them.
     */
    static async runSync() {
        console.log(`[SyncWorker] Starting synchronization process at ${new Date().toISOString()}`);

        try {
            const courtsWithIntegration = await Court.findAll({
                where: {
                    integration_type: ['scraping', 'api', 'ical']
                }
            });

            console.log(`[SyncWorker] Found ${courtsWithIntegration.length} courts to sync.`);

            for (const court of courtsWithIntegration) {
                try {
                    await this.syncCourt(court);
                } catch (err) {
                    console.error(`[SyncWorker] Failed to sync court ${court.name}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[SyncWorker] Global sync error:', err);
        }
    }

    /**
     * Syncs a single court's data.
     */
    static async syncCourt(court) {
        let externalSlots = [];

        if (court.integration_type === 'scraping') {
            externalSlots = await ScraperService.scrapeCourt(court);
        } else if (court.integration_type === 'api') {
            // Future placeholder: externalSlots = await APIService.fetch(court);
        }

        if (externalSlots.length === 0) {
            console.log(`[SyncWorker] No slots found for ${court.name}.`);
            return;
        }

        console.log(`[SyncWorker] Processing ${externalSlots.length} external slots for ${court.name}...`);

        // Use today's date for simplicity in this demo (scraper should ideally provide dates)
        const today = dateToStr(new Date());

        for (const slotData of externalSlots) {
            // Find or create the slot to avoid duplicates
            // We use external_id + court_id + date as the unique key for synced slots
            await Slot.findOrCreate({
                where: {
                    court_id: court.id,
                    date: today,
                    external_id: slotData.external_id
                },
                defaults: {
                    court_id: court.id,
                    time: slotData.time,
                    price: slotData.price,
                    is_available: true,
                    is_synced: true
                }
            });
        }

        // Update last sync time
        await court.update({ last_sync: new Date() });
        console.log(`[SyncWorker] Successfully synced ${court.name}.`);
    }
}

module.exports = SyncWorker;
