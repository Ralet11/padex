const puppeteer = require('puppeteer');

/**
 * ScraperService handles fetching data from external court booking websites.
 */
class ScraperService {
    /**
     * Scrapes a specific court based on its integration configuration.
     * @param {Object} court - The court model instance.
     * @returns {Promise<Array>} - List of available slots found.
     */
    static async scrapeCourt(court) {
        if (court.integration_type !== 'scraping' || !court.integration_config) {
            console.log(`[Scraper] Court ${court.name} is not configured for scraping.`);
            return [];
        }

        const { url, strategy } = court.integration_config;
        console.log(`[Scraper] Starting scrape for ${court.name} using strategy: ${strategy}`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // Set a common user agent to avoid basic blocking
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

            // Strategy pattern: handle different website layouts
            switch (strategy) {
                case 'generic-table':
                    return await this.scrapeGenericTable(page, url, court.integration_config);
                // Add more strategies here: 'playtomic-web', 'easycancha-web', etc.
                default:
                    throw new Error(`Unknown scraping strategy: ${strategy}`);
            }
        } catch (error) {
            console.error(`[Scraper] Error scraping ${court.name}:`, error.message);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    /**
     * A generic strategy that looks for time slots in a table or list.
     * This is an example implementation.
     */
    static async scrapeGenericTable(page, url, config) {
        const { slotSelector, timeSelector, priceSelector } = config;
        
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for the container to load
        if (slotSelector) {
            await page.waitForSelector(slotSelector, { timeout: 10000 });
        }

        const slots = await page.evaluate((sSel, tSel, pSel) => {
            const elements = document.querySelectorAll(sSel);
            const results = [];
            
            elements.forEach(el => {
                const time = el.querySelector(tSel)?.innerText?.trim();
                const priceText = el.querySelector(pSel)?.innerText?.trim();
                
                if (time) {
                    // Basic price parsing (remove $ and ,)
                    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
                    
                    results.push({
                        time,
                        price,
                        external_id: `${time}-${price}` // Simple composite ID
                    });
                }
            });
            
            return results;
        }, slotSelector, timeSelector, priceSelector);

        return slots;
    }
}

module.exports = ScraperService;
