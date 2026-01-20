import { IPaginationOptions } from '../../interface/pagination.type';
import { prisma } from '../../utils/prisma';
import ApiError from '../../errors/AppError';
import httpStatus from 'http-status';
import { paginationHelper } from '../../utils/calculatePagination';
import { Prisma, TaskCategory, TaskStatus } from '@prisma/client';
import { Request } from 'express';
import { fileUploader } from '../../utils/fileUploader';
import {
  CACHE_CONFIG,
  CacheKeyGenerator,
  CacheManager,
  SmartCacheUpdater,
} from '../../utils/cache/cacheManager';
import {
  calculateTaskStatusAndDays,
  getCategoryDisplayName,
  isTaskOverdue,
} from './tasks.constant';

const CACHE_PREFIX = CACHE_CONFIG.TASKS.prefix;
const CACHE_TTL = CACHE_CONFIG.TASKS.ttl;

const taskCacheUpdater = new SmartCacheUpdater({
  prefix: CACHE_PREFIX,
  ttl: CACHE_TTL,
  idField: 'id',
  userIdField: 'userId',
  sortField: 'createdAt',
  sortOrder: 'desc',
  enrichFunction: (task: any) => ({
    ...task,
    remainingDays: calculateTaskStatusAndDays(task.startDate, task.endDate),
  }),
});

export const autoUpdateOverdueTasks = async (userId: string) => {
  const now = new Date();
  // const todayStart = startOfDay(now);

  // Find potential overdue tasks (end date is today or before)
  const potentialOverdueTasks = await prisma.tasks.findMany({
    where: {
      userId,
      status: TaskStatus.Pending,
      endDate: { lte: now },
      isDeleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  if (potentialOverdueTasks.length === 0) {
    return false;
  }

  console.log(
    `Found ${potentialOverdueTasks.length} potential overdue tasks for user ${userId}`,
  );

  // Filter tasks that are truly overdue (considering time)
  const tasksToUpdate = potentialOverdueTasks.filter(task => {
    const overdue = isTaskOverdue(task.endDate, task.time);

    if (overdue) {
      console.log(
        `[${task.title}] → Overdue (Date: ${task.endDate.toLocaleDateString()}, Time: ${task.time || 'not set'})`,
      );
    } else {
      console.log(
        `[${task.title}] → NOT overdue yet (Current: ${now.toLocaleTimeString()}, Task: ${task.time})`,
      );
    }

    return overdue;
  });

  if (tasksToUpdate.length === 0) {
    console.log('No tasks are actually overdue yet (time not passed)');
    return false;
  }

  // Get IDs of tasks to update
  const taskIdsToUpdate = tasksToUpdate.map(task => task.id);

  // Update in database
  await prisma.tasks.updateMany({
    where: {
      id: { in: taskIdsToUpdate },
    },
    data: {
      status: TaskStatus.Passed,
    },
  });

  // ✅ Use dynamic cache updater for batch update
  const updates = tasksToUpdate.map(task => ({
    id: task.id,
    data: { ...task, status: TaskStatus.Passed },
  }));

  const homeCacheKey = CacheKeyGenerator.byUserId(CACHE_PREFIX, userId, 'home');
  CacheManager.delete(homeCacheKey);

  console.log(
    `⚡ Auto-updated ${tasksToUpdate.length} overdue tasks to "Passed" status`,
  );

  return true;
};

// Create Task
const createTasks = async (req: Request) => {
  const userId = req.user.id;
  const data = req.body.data ? JSON.parse(req.body.data) : {};
  const file = req.file;
  let image;

  if (file) {
    image = (await fileUploader.uploadToCloudinary(file)).Location;
  }

  const addedData = {
    ...data,
    userId,
    image,
  };

  const result = await prisma.tasks.create({
    data: addedData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  // ✅ Dynamic cache add for lists
  taskCacheUpdater.add(result);

  // ✅ Invalidate home cache after create
  const homeCacheKey = CacheKeyGenerator.byUserId(CACHE_PREFIX, userId, 'home');
  CacheManager.delete(homeCacheKey);

  return result;
};

// Get All Tasks
type ITasksFilterRequest = {
  searchTerm?: string;
  id?: string;
  createdAt?: string;
  status?: string;
  category?: string;
};

const tasksSearchAbleFields = ['title'];

const getTasksListIntoDb = async (
  options: IPaginationOptions,
  filters: ITasksFilterRequest,
  userId: string,
) => {
  // Auto-update overdue tasks
  await autoUpdateOverdueTasks(userId);

  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  // Generate cache key
  const cacheKey = CacheKeyGenerator.list(CACHE_PREFIX, {
    userId,
    page,
    limit,
    searchTerm,
    ...filterData,
  });

  // Try cache
  const cached = CacheManager.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build query conditions
  const andConditions: Prisma.TasksWhereInput[] = [];
  andConditions.push({ userId });

  if (searchTerm) {
    andConditions.push({
      OR: tasksSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    Object.keys(filterData).forEach(key => {
      const value = (filterData as any)[key];
      if (value === '' || value === null || value === undefined) return;
      // hell
      if (key === 'createdAt' && value) {
        const start = new Date(value);
        start.setHours(0, 0, 0, 0);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        andConditions.push({
          createdAt: {
            gte: start.toISOString(),
            lte: end.toISOString(),
          },
        });
        return;
      }

      if (key === 'category') {
        const categories = Array.isArray(value) ? value : [value];
        andConditions.push({
          category: { in: categories },
        });
        return;
      }
      if (key === 'status') {
        const statuses = Array.isArray(value) ? value : [value];
        andConditions.push({
          status: { in: statuses },
        });
        return;
      }

      andConditions.push({
        [key]: value,
      });
    });
  }

  const whereConditions: Prisma.TasksWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Fetch from database
  const tasks = await prisma.tasks.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  const total = await prisma.tasks.count({ where: whereConditions });

  const enrichedTasks = tasks.map(task => ({
    ...task,
    remainingDays: calculateTaskStatusAndDays(task.startDate, task.endDate),
  }));

  const response = {
    meta: { total, page, limit },
    data: enrichedTasks,
  };

  // Store in cache
  CacheManager.set(cacheKey, response, CACHE_TTL);
  return response;
};

// Get Tasks by Date
const getTasksListByDate = async (
  options: IPaginationOptions,
  filters: ITasksFilterRequest,
  userId: string,
  taskDate: string,
) => {
  // Auto-update
  await autoUpdateOverdueTasks(userId);

  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const targetDate = new Date(taskDate);

  if (isNaN(targetDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format');
  }

  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Cache key
  const cacheKey = CacheKeyGenerator.list(CACHE_PREFIX, {
    userId,
    page,
    limit,
    searchTerm,
    taskDate,
    ...filterData,
  });

  const cached = CacheManager.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build conditions
  const andConditions: Prisma.TasksWhereInput[] = [];
  andConditions.push({ userId });
  andConditions.push({
    OR: [
      {
        AND: [
          { startDate: { lte: targetDate } },
          { endDate: { gte: targetDate } },
        ],
      },
      { startDate: { gte: targetDate, lt: nextDay } },
      { endDate: { gte: targetDate, lt: nextDay } },
    ],
  });

  if (searchTerm) {
    andConditions.push({
      OR: tasksSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    Object.keys(filterData).forEach(key => {
      const value = (filterData as any)[key];
      if (value === '' || value === null || value === undefined) return;

      if (key === 'status') {
        const statuses = Array.isArray(value) ? value : [value];
        andConditions.push({
          status: { in: statuses },
        });
        return;
      }

      andConditions.push({
        [key]: value,
      });
    });
  }

  const whereConditions: Prisma.TasksWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const tasks = await prisma.tasks.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  const total = await prisma.tasks.count({ where: whereConditions });

  const enrichedTasks = tasks.map(task => ({
    ...task,
    remainingDays: calculateTaskStatusAndDays(task.startDate, task.endDate),
  }));

  const response = {
    meta: { total, page, limit, targetDate: targetDate.toISOString() },
    data: enrichedTasks,
  };

  CacheManager.set(cacheKey, response, CACHE_TTL);
  return response;
};

// Get Task by ID
const getTasksById = async (id: string) => {
  const cacheKey = CacheKeyGenerator.byId(CACHE_PREFIX, id);

  const cached = CacheManager.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await prisma.tasks.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  CacheManager.set(cacheKey, result, CACHE_TTL);
  return result;
};

// Get Home Page Data with Cache
const getHomePageData = async (req: Request) => {
  const userId = req.user.id;

  // Generate cache key
  const cacheKey = CacheKeyGenerator.byUserId(CACHE_PREFIX, userId, 'home');

  // Try cache first
  const cached = CacheManager.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const allTasks = await prisma.tasks.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      time: true,
      category: true,
      status: true,
    },
  });

  const inProgressTasks = allTasks
    .filter(task => task.status === TaskStatus.Ongoing)
    .map(task => {
      const sameCategoryTasks = allTasks.filter(
        t => t.category === task.category,
      );
      const completedCount = sameCategoryTasks.filter(
        t => t.status === TaskStatus.Completed,
      ).length;

      const totalCount = sameCategoryTasks.length;
      const progress =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        title: task.title,
        category: getCategoryDisplayName(task.category),
        categoryType: task.category,
        time: task.time,
        progress: progress,
      };
    });

  const categoryGroups = [
    TaskCategory.office_task,
    TaskCategory.personal_project,
    TaskCategory.daily_study,
    TaskCategory.health_fitness,
    TaskCategory.family_home,
    TaskCategory.finance_money,
    TaskCategory.shopping_purchase,
    TaskCategory.self_development,
    TaskCategory.entertainment,
    TaskCategory.travel_trip,
    TaskCategory.appointment_meeting,
    TaskCategory.side_hustle,
    TaskCategory.spiritual_religious,
    TaskCategory.maintenance_repair,
  ];

  const taskGroups = categoryGroups
    .map(category => {
      const categoryTasks = allTasks.filter(task => task.category === category);

      if (categoryTasks.length === 0) return null;

      const completedTasks = categoryTasks.filter(
        task => task.status === TaskStatus.Completed,
      ).length;

      const totalTasks = categoryTasks.length;
      const percentage = Math.round((completedTasks / totalTasks) * 100);

      return {
        name: getCategoryDisplayName(category),
        categoryType: category,
        taskCount: totalTasks,
        completedCount: completedTasks,
        percentage: percentage,
      };
    })
    .filter(group => group !== null);

  const response = {
    inProgress: {
      count: inProgressTasks.length,
      tasks: inProgressTasks,
    },
    taskGroups: {
      count: taskGroups.length,
      groups: taskGroups,
    },
    summary: {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === TaskStatus.Completed)
        .length,
      ongoingTasks: inProgressTasks.length,
      pendingTasks: allTasks.filter(t => t.status === TaskStatus.Pending)
        .length,
    },
  };

  // Store in cache
  CacheManager.set(cacheKey, response, CACHE_TTL);
  return response;
};

// Update Task Status with Cache Invalidation
const updateTaskStatus = async (req: Request) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const status = req.body.status;

  const result = await prisma.tasks.update({
    where: {
      id: taskId,
    },
    data: {
      status,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  // ✅ Update cache using dynamic updater
  taskCacheUpdater.update(taskId, result);

  // ✅ Invalidate home page cache because status changed
  const homeCacheKey = CacheKeyGenerator.byUserId(CACHE_PREFIX, userId, 'home');
  CacheManager.delete(homeCacheKey);

  return result;
};

// Update Task
const updateTasksIntoDb = async (req: Request) => {
  const id = req.params.id;
  const userId = req.user.id;
  const data = req.body.data ? JSON.parse(req.body.data) : {};
  const file = req.file;
  let image;

  if (file) {
    image = (await fileUploader.uploadToCloudinary(file)).Location;
  }

  const updatedData = { ...data, image };
  const result = await prisma.tasks.update({
    where: { id },
    data: updatedData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  // ✅ Dynamic cache update
  taskCacheUpdater.update(id, result);

  // ✅ Invalidate home cache after update
  const homeCacheKey = CacheKeyGenerator.byUserId(CACHE_PREFIX, userId, 'home');
  CacheManager.delete(homeCacheKey);

  return result;
};

// Delete Task
const deleteTasksIntoDb = async (id: string) => {
  const task = await prisma.tasks.findUnique({
    where: { id },
    select: { userId: true },
  });

  const result = await prisma.tasks.delete({
    where: { id },
  });

  // ✅ Dynamic cache remove
  taskCacheUpdater.remove(id, task?.userId);

  // ✅ Invalidate home cache after delete
  if (task?.userId) {
    const homeCacheKey = CacheKeyGenerator.byUserId(
      CACHE_PREFIX,
      task.userId,
      'home',
    );
    CacheManager.delete(homeCacheKey);
  }

  return result;
};

export const tasksService = {
  createTasks,
  getTasksListIntoDb,
  getTasksListByDate,
  getTasksById,
  getHomePageData,
  updateTasksIntoDb,
  updateTaskStatus,
  deleteTasksIntoDb,
};
