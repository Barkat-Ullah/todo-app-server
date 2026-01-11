import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pickValidFields';
import { tasksService } from './tasks.service';

// create Tasks
const createTasks = catchAsync(async (req: Request, res: Response) => {
  const result = await tasksService.createTasks(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Tasks created successfully',
    data: result,
  });
});

// get all Tasks
const tasksFilterableFields = ['searchTerm', 'id', 'createdAt'];
const getTasksList = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filters = pick(req.query, tasksFilterableFields);
  const result = await tasksService.getTasksListIntoDb(
    options,
    filters,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks list retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});
const getTaskListByDate = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filters = pick(req.query, tasksFilterableFields);
  const { taskDate } = req.query;
  const result = await tasksService.getTasksListByDate(
    options,
    filters,
    req.user.id,
    taskDate as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks list retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

// get Tasks by id
const getTasksById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await tasksService.getTasksById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks details retrieved successfully',
    data: result,
  });
});
const getHomePageTasks = catchAsync(async (req: Request, res: Response) => {
  const result = await tasksService.getHomePageData(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: ' Home Page details retrieved successfully',
    data: result,
  });
});

// update Tasks
const updateTasksStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await tasksService.updateTaskStatus(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task status updated successfully',
    data: result,
  });
});
const updateTasks = catchAsync(async (req: Request, res: Response) => {
  const result = await tasksService.updateTasksIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks updated successfully',
    data: result,
  });
});

// delete Tasks
const deleteTasks = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await tasksService.deleteTasksIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks deleted successfully',
    data: result,
  });
});

export const tasksController = {
  createTasks,
  getTasksList,
  getTaskListByDate,
  getTasksById,
  updateTasks,
  deleteTasks,
  getHomePageTasks,
  updateTasksStatus,
};
