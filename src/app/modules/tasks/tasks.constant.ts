import { startOfDay, addDays } from 'date-fns';
import prisma from '../../utils/prisma';
import { createNotification } from '../../utils/notify';
import { TaskCategory, TaskStatus } from '@prisma/client';

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

    if (tasksEndingTomorrow.length === 0) return;

    console.log(
      `Found ${tasksEndingTomorrow.length} tasks due tomorrow for user ${userId}`,
    );

    for (const task of tasksEndingTomorrow) {
      await createNotification({
        receiverId: userId,
        senderId: null,
        title: 'Reminder: Task Due Tomorrow!',
        body: `Your task "${task.title}" is due tomorrow (${new Date(task.endDate).toLocaleDateString()})`,
        referenceId: task.id,
      });
    }
  } catch (error) {
    console.error('Error in due-tomorrow reminder check:', error);
  }
}

export async function checkAndNotifyOverdueTasks(
  userId: string,
): Promise<void> {
  try {
    const now = new Date();

    const overdueTasks = await prisma.tasks.findMany({
      where: {
        userId,
        status: TaskStatus.Pending,
        isDeleted: false,
        OR: [
          { endDate: { lt: startOfDay(now) } },

          {
            AND: [
              { endDate: { gte: startOfDay(now) } },
              { endDate: { lt: addDays(startOfDay(now), 1) } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        time: true,
      },
    });

    const nowTime = now.getHours() * 60 + now.getMinutes();

    const tasksToNotify = overdueTasks.filter(task => {
      if (task.endDate < startOfDay(now)) return true;
      const [timeStr, period] = task.time.split(' ');
      const [hoursStr, minutesStr] = timeStr.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;

      const taskEndMinutes = hours * 60 + minutes;

      return nowTime > taskEndMinutes;
    });

    if (tasksToNotify.length === 0) return;

    console.log(
      `Found ${tasksToNotify.length} overdue tasks for user ${userId}`,
    );

    for (const task of tasksToNotify) {
      await createNotification({
        receiverId: userId,
        senderId: null,
        title: 'Task Overdue!',
        body: `Your task "${task.title}" was due on ${new Date(task.endDate).toLocaleDateString()} at ${task.time} and is still pending.`,
        referenceId: task.id,
      });

      await prisma.tasks.update({
        where: { id: task.id },
        data: { status: TaskStatus.Passed },
      });
    }
  } catch (error) {
    console.error('Overdue notification error:', error);
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