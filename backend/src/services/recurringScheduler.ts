import cron from 'node-cron';
import { processRecurringExpenses } from './recurringExpenseService.js';

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;

export function startRecurringScheduler() {
  if (schedulerTask) {
    console.log('⚠️  Recurring expense scheduler already running');
    return;
  }

  // Run every hour at minute 0 (0 * * * *)
  // You can adjust this to run more/less frequently:
  // - Every 15 minutes: */15 * * * *
  // - Every day at midnight: 0 0 * * *
  // - Every Monday at 9am: 0 9 * * 1
  
  schedulerTask = cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running recurring expense scheduler...');
    const startTime = Date.now();
    
    try {
      const results = await processRecurringExpenses();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Recurring scheduler completed in ${duration}ms`);
      console.log(`📊 Results: ${results.length} expenses processed`);
      
      // Log summary
      const created = results.filter(r => r.status === 'created').length;
      const expired = results.filter(r => r.status === 'expired').length;
      const errors = results.filter(r => r.status === 'error').length;
      
      if (created > 0) console.log(`  ✅ Created: ${created}`);
      if (expired > 0) console.log(`  ⏹️  Expired: ${expired}`);
      if (errors > 0) console.log(`  ❌ Errors: ${errors}`);
      
    } catch (error) {
      console.error('❌ Recurring scheduler error:', error);
    }
  });

  console.log('✅ Recurring expense scheduler started (runs hourly at :00)');
  console.log('   Schedule: Every hour at minute 0');
  console.log('   Next run: ' + getNextRunTime());
}

export function stopRecurringScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('🛑 Recurring expense scheduler stopped');
  } else {
    console.log('⚠️  No recurring scheduler to stop');
  }
}

function getNextRunTime(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1);
  next.setMinutes(0);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next.toLocaleString();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping scheduler...');
  stopRecurringScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping scheduler...');
  stopRecurringScheduler();
  process.exit(0);
});
