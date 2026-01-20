import cron from 'node-cron';
import prisma from '../../utils/prisma';
import {
  checkAndNotifyOverdueTasks,
  checkAndSendDueTomorrowReminders,
} from './tasks.constant';

/**
 * Clean up old notifications (older than 30 days)
 * This prevents database bloat
 */
async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  console.log(`Cleaned up ${result.count} old notification records`);
  return result.count;
}

/**
 * Start all task notification schedulers
 */
export function startTaskNotificationScheduler() {
  console.log('🚀 Starting Task Notification Schedulers...');

  // ⏰ Run every day at 8:00 AM - Check for tasks due tomorrow
  cron.schedule('0 8 * * *', async () => {
    console.log('📅 Running daily "Due Tomorrow" reminder check...');

    try {
      const users = await prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true, email: true },
      });

      console.log(`Found ${users.length} active users to check`);

      for (const user of users) {
        await checkAndSendDueTomorrowReminders(user.id);
      }

      console.log('✅ Daily "Due Tomorrow" notifications completed');
    } catch (error) {
      console.error('❌ Error in due-tomorrow scheduler:', error);
    }
  });

  // ⏰ Run every hour - Check for overdue tasks
  cron.schedule('0 * * * *', async () => {
    console.log('⏱️  Running hourly overdue task check...');

    try {
      const users = await prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true },
      });

      for (const user of users) {
        await checkAndNotifyOverdueTasks(user.id);
      }

      console.log('✅ Hourly overdue check completed');
    } catch (error) {
      console.error('❌ Error in overdue scheduler:', error);
    }
  });

  // 🧹 Run every day at 2:00 AM - Clean up old notification records
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Cleaning up old notification records...');

    try {
      await cleanupOldNotifications();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error in cleanup scheduler:', error);
    }
  });

  console.log('✅ All Task Notification Schedulers Started Successfully!');
//   console.log('  - Due Tomorrow Reminders: Every day at 8:00 AM');
//   console.log('  - Overdue Task Checks: Every hour');
//   console.log('  - Notification Cleanup: Every day at 2:00 AM');
}

/**
 * Manually trigger notification checks for a specific user (for testing)
 */
export async function manualTriggerNotifications(userId: string) {
  console.log(`Manually triggering notifications for user: ${userId}`);

  await checkAndSendDueTomorrowReminders(userId);
  await checkAndNotifyOverdueTasks(userId);

  console.log('Manual notification trigger completed');
}
