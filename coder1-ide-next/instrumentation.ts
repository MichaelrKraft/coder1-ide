/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize background services like the cron scheduler.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing server-side services...');

    // Dynamically import to avoid client-side bundling issues
    const { getCronService } = await import('@/services/johnny5/cron-service');

    try {
      const cronService = getCronService();
      await cronService.initialize();

      // Create default jobs if they don't exist
      await cronService.createDefaultJobs('system');

      // Start the cron service
      await cronService.start();

      console.log('[Instrumentation] Cron service started successfully');
      console.log('[Instrumentation] Johnny5 is now ready to run scheduled tasks');
    } catch (error) {
      console.error('[Instrumentation] Failed to start cron service:', error);
    }
  }
}
