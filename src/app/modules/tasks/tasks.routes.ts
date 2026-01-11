import express from 'express';
import auth from '../../middlewares/auth';
import { tasksController } from './tasks.controller';
import { fileUploader } from '../../utils/fileUploader';

const router = express.Router();

router.post(
  '/',
  auth(),
  fileUploader.uploadSingle,
  tasksController.createTasks,
);

router.get('/', auth(), tasksController.getTasksList);
router.get('/date', auth(), tasksController.getTaskListByDate);
router.get('/home', auth(), tasksController.getHomePageTasks);

router.get('/:id', auth(), tasksController.getTasksById);

router.patch('/:id', auth(), tasksController.updateTasksStatus);
router.put(
  '/:id',
  auth(),
  fileUploader.uploadSingle,
  tasksController.updateTasks,
);

router.delete('/:id', auth(), tasksController.deleteTasks);

export const tasksRoutes = router;
