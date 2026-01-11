import express from 'express';

import auth from '../../middlewares/auth';
import { FollowController } from './follow.controller';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();
router.get(
  '/my-counts',
  auth(UserRoleEnum.USER),
  FollowController.getMyFollowCountsController,
);
router.get(
  '/suggested-people',
  auth(UserRoleEnum.USER),
  FollowController.getMyFollowerFollowingList,
);

router.get('/counts/:userId', FollowController.getFollowCountsController);

router.get('/followers/:userId', FollowController.getFollowers);
router.get('/following/:userId', FollowController.getFollowing);
router.post(
  '/follow-user',
  auth(UserRoleEnum.USER),
  FollowController.followUser,
);
router.post(
  '/unfollow-user',
  auth(UserRoleEnum.USER),
  FollowController.unfollowUser,
);

export const FollowRoutes = router;
