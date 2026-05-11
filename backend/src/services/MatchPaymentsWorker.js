const cron = require('node-cron');
const {
  findExpirablePendingPayments,
  expirePaymentIntent,
  findIncompletePaidMatches,
  cancelIncompletePaidMatch,
} = require('./payments/matchPayments');

class MatchPaymentsWorker {
  static init() {
    console.log('[MatchPaymentsWorker] Initializing payment worker (every 10 minutes)...');

    cron.schedule('*/10 * * * *', () => {
      this.run().catch((err) => console.error('[MatchPaymentsWorker] Scheduled run failed:', err));
    });

    setTimeout(() => {
      this.run().catch((err) => console.error('[MatchPaymentsWorker] Initial run failed:', err));
    }, 15000);
  }

  static async run() {
    const now = new Date();
    console.log(`[MatchPaymentsWorker] Scanning payment intents at ${now.toISOString()}`);

    const expirablePayments = await findExpirablePendingPayments(now);
    for (const payment of expirablePayments) {
      try {
        await expirePaymentIntent(payment.id, 'payment_intent_expired');
      } catch (err) {
        console.error(`[MatchPaymentsWorker] Failed to expire payment ${payment.id}:`, err.message);
      }
    }

    const incompleteMatches = await findIncompletePaidMatches(now);
    for (const match of incompleteMatches) {
      try {
        await cancelIncompletePaidMatch(match.id, 'match_incomplete_deadline');
      } catch (err) {
        console.error(`[MatchPaymentsWorker] Failed to cancel match ${match.id}:`, err.message);
      }
    }
  }
}

module.exports = MatchPaymentsWorker;
