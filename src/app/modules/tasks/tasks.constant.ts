import { startOfDay, addDays } from 'date-fns';
import prisma from '../../utils/prisma';
import { createNotification } from '../../utils/notify';
import { TaskCategory, TaskStatus, NotifyType } from '@prisma/client';

export function calculateTaskStatusAndDays(
  startDate: Date,
  endDate: Date,
  currentDate: Date = new Date(),
): string {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const daysToStart = Math.floor(
    (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysToEnd = Math.floor(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysToStart > 0) {
    if (daysToStart === 1) return 'Starts tomorrow';
    return `Starts in ${daysToStart} days`;
  }

  if (daysToStart === 0) {
    if (daysToEnd === 0) return 'Today only';
    if (daysToEnd === 1) return 'Ends tomorrow';
    return `${daysToEnd} days left`;
  }

  if (daysToEnd > 0) {
    if (daysToEnd === 1) return '1 day left';
    return `${daysToEnd} days left`;
  }

  if (daysToEnd === 0) {
    return 'Due today';
  }

  return `Overdue by ${Math.abs(daysToEnd)} ${Math.abs(daysToEnd) === 1 ? 'day' : 'days'}`;
}

export function isTaskOverdue(endDate: Date, time: string | null): boolean {
  const now = new Date();
  const todayStart = startOfDay(now);
  const taskDate = startOfDay(endDate);

  // If end date is before today, it's definitely overdue
  if (taskDate < todayStart) {
    return true;
  }

  // If end date is after today, it's not overdue yet
  if (taskDate > todayStart) {
    return false;
  }

  // End date is today - check time
  if (!time || time.trim() === '') {
    // No time specified - consider overdue at end of day
    // For now, treat as overdue immediately if no time set
    return true;
  }

  try {
    const timeStr = time.trim();

    // Handle different time formats
    let hours: number;
    let minutes: number;

    // Check if time has AM/PM
    if (
      timeStr.includes('AM') ||
      timeStr.includes('PM') ||
      timeStr.includes('am') ||
      timeStr.includes('pm')
    ) {
      const parts = timeStr.split(/\s+/);
      if (parts.length < 2) return true; // Invalid format, treat as overdue

      const [timePart, period] = parts;
      const [hoursStr, minutesStr = '00'] = timePart.split(':');

      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);

      if (isNaN(hours) || isNaN(minutes)) return true;

      const upperPeriod = period.toUpperCase();
      if (upperPeriod === 'PM' && hours !== 12) hours += 12;
      if (upperPeriod === 'AM' && hours === 12) hours = 0;
    } else {
      // 24-hour format (e.g., "09:15" or "14:30")
      const [hoursStr, minutesStr = '00'] = timeStr.split(':');
      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);

      if (isNaN(hours) || isNaN(minutes)) return true;
    }

    // Convert to minutes for comparison
    const taskMinutes = hours * 60 + minutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return currentMinutes > taskMinutes;
  } catch (error) {
    console.error('Error parsing time:', error);
    return true; // If time parsing fails, treat as overdue
  }
}

/**
 * Check if notification already exists today for this task and type
 */
async function wasNotificationSentToday(
  userId: string,
  taskId: string,
  type: NotifyType,
): Promise<boolean> {
  const todayStart = startOfDay(new Date());

  const existing = await prisma.notification.findFirst({
    where: {
      receiverId: userId,
      referenceId: taskId,
      type: type,
      createdAt: {
        gte: todayStart,
      },
    },
  });

  return !!existing;
}

export async function checkAndSendDueTomorrowReminders(
  userId: string,
): Promise<void> {
  try {
    const today = new Date();
    const tomorrowStart = startOfDay(addDays(today, 1));
    const tomorrowEnd = addDays(tomorrowStart, 1);

    // Find tasks that end tomorrow and are not completed/passed
    const tasksEndingTomorrow = await prisma.tasks.findMany({
      where: {
        userId,
        endDate: {
          gte: tomorrowStart,
          lt: tomorrowEnd,
        },
        status: {
          notIn: [TaskStatus.Completed, TaskStatus.Passed],
        },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        userId: true,
      },
    });

    if (tasksEndingTomorrow.length === 0) {
      console.log(`No tasks due tomorrow for user ${userId}`);
      return;
    }

    console.log(
      `Found ${tasksEndingTomorrow.length} tasks due tomorrow for user ${userId}`,
    );

    let sentCount = 0;
    let skippedCount = 0;

    for (const task of tasksEndingTomorrow) {
      // ✅ Check if notification already sent today
      const alreadySent = await wasNotificationSentToday(
        userId,
        task.id,
        NotifyType.due_tomorrow,
      );

      if (alreadySent) {
        console.log(`⏭️  Skipping duplicate notification for: ${task.title}`);
        skippedCount++;
        continue;
      }

      // Send notification
      await createNotification({
        receiverId: userId,
        senderId: null,
        title: 'Reminder: Task Due Tomorrow!',
        body: `Your task "${task.title}" is due tomorrow (${new Date(task.endDate).toLocaleDateString()})`,
        referenceId: task.id,
        type: NotifyType.due_tomorrow,
      });

      console.log(`✅ Sent reminder for: ${task.title}`);
      sentCount++;
    }

    console.log(
      `Due Tomorrow Summary: ${sentCount} sent, ${skippedCount} skipped (already notified)`,
    );
  } catch (error) {
    console.error('Error in due-tomorrow reminder check:', error);
  }
}

export async function checkAndNotifyOverdueTasks(
  userId: string,
): Promise<void> {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));

    const potentialOverdue = await prisma.tasks.findMany({
      where: {
        userId,
        status: TaskStatus.Pending,
        isDeleted: false,
        endDate: {
          lt: tomorrowStart,
        },
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        time: true,
      },
    });

    if (potentialOverdue.length === 0) {
      console.log(`No potential overdue tasks for user ${userId}`);
      return;
    }

    const tasksToNotify = potentialOverdue.filter(task => {
      const taskDate = startOfDay(task.endDate);

      if (taskDate < todayStart) {
        console.log(`[${task.title}] → Overdue by date`);
        return true;
      }

      if (!task.time || task.time.trim() === '') {
        console.log(`[${task.title}] → No time specified → considered overdue`);
        return true;
      }

      try {
        const timeStr = task.time.trim();
        const parts = timeStr.split(/\s+/);

        if (parts.length < 2) {
          console.log(`[${task.title}] → Invalid time format: "${timeStr}"`);
          return true;
        }

        const [timePart, period] = parts;
        const [hoursStr, minutesStr = '00'] = timePart.split(':');

        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);

        if (isNaN(hours) || isNaN(minutes)) {
          console.log(`[${task.title}] → Cannot parse time: "${timeStr}"`);
          return true;
        }

        let taskHours = hours;
        const upperPeriod = period.toUpperCase();

        if (upperPeriod === 'PM' && taskHours !== 12) taskHours += 12;
        if (upperPeriod === 'AM' && taskHours === 12) taskHours = 0;

        const taskMinutes = taskHours * 60 + minutes;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const isOverdue = currentMinutes > taskMinutes;

        console.log(
          `[${task.title}] → Task: ${taskMinutes} min | Now: ${currentMinutes} min → ${
            isOverdue ? 'OVERDUE' : 'NOT YET'
          }`,
        );

        return isOverdue;
      } catch (parseError) {
        console.error(`[${task.title}] Time parsing error:`, parseError);
        return true;
      }
    });

    if (tasksToNotify.length === 0) {
      console.log(`No tasks to notify as overdue for user ${userId}`);
      return;
    }

    console.log(
      `Found ${tasksToNotify.length} overdue tasks for user ${userId}`,
    );

    let sentCount = 0;
    let skippedCount = 0;

    for (const task of tasksToNotify) {
      // ✅ Check if notification already sent today
      const alreadySent = await wasNotificationSentToday(
        userId,
        task.id,
        NotifyType.overdue,
      );

      if (alreadySent) {
        console.log(
          `⏭️  Skipping duplicate overdue notification for: ${task.title}`,
        );
        skippedCount++;
        continue;
      }

      // Send notification
      await createNotification({
        receiverId: userId,
        senderId: null,
        title: 'Task Overdue!',
        body: `Your task "${task.title}" was due on ${new Date(
          task.endDate,
        ).toLocaleDateString(
          'en-GB',
        )} at ${task.time ?? 'midnight'} and is still pending.`,
        referenceId: task.id,
        type: NotifyType.overdue,
      });

      // Status update
      await prisma.tasks.update({
        where: { id: task.id },
        data: { status: TaskStatus.Passed },
      });

      console.log(`✅ Notified & updated: ${task.title}`);
      sentCount++;
    }

    console.log(
      `Overdue Summary: ${sentCount} sent, ${skippedCount} skipped (already notified)`,
    );
  } catch (error) {
    console.error('Critical error in checkAndNotifyOverdueTasks:', error);
  }
}

export function getCategoryDisplayName(category: TaskCategory): string {
  const names = {
    [TaskCategory.office_task]: 'Office Project',
    [TaskCategory.personal_project]: 'Personal Project',
    [TaskCategory.daily_study]: 'Daily Study',
    [TaskCategory.health_fitness]: 'Health & Fitness',
    [TaskCategory.family_home]: 'Family & Home',
    [TaskCategory.finance_money]: 'Finance & Money',
    [TaskCategory.shopping_purchase]: 'Shopping',
    [TaskCategory.self_development]: 'Self Development',
    [TaskCategory.entertainment]: 'Entertainment',
    [TaskCategory.travel_trip]: 'Travel & Trip',
    [TaskCategory.appointment_meeting]: 'Appointment',
    [TaskCategory.side_hustle]: 'Side Hustle',
    [TaskCategory.spiritual_religious]: 'Spiritual',
    [TaskCategory.maintenance_repair]: 'Maintenance',
  };
  return names[category] || category;
}
