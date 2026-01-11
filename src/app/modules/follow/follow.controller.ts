import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';

import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { FollowServices } from './follow.service';

const followUser = catchAsync(async (req: Request, res: Response) => {
  const followerId = req.user.id;
  const { followingId } = req.body;

  const result = await FollowServices.followUser(followerId, followingId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Successfully followed ${result.following.fullName}`,
    data: result,
  });
});

const unfollowUser = catchAsync(async (req: Request, res: Response) => {
  const followerId = req.user.id;
  const { followingId } = req.body;

  const result = await FollowServices.unfollowUser(followerId, followingId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Successfully unfollowed ${result.following.fullName}`,
    data: result,
  });
});

const getFollowers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const followers = await FollowServices.getFollowers(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Followers retrieved successfully',
    data: followers,
  });
});

const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const following = await FollowServices.getFollowing(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Following retrieved successfully',
    data: following,
  });
});

const getFollowCountsController = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const counts = await FollowServices.getFollowCounts(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Follow counts retrieved successfully',
      data: counts,
    });
  },
);

const getMyFollowCountsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const counts = await FollowServices.getMyFollowCounts(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Your follow counts retrieved successfully',
      data: counts,
    });
  },
);
const getMyFollowerFollowingList = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const searchQuery = (req.query.search as string) || '';
    const { users } = await FollowServices.getMyFollowerFollowingList(
      userId,
      searchQuery,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Your follower and following counts retrieved successfully',
      data: users,
      // data: { users },
    });
  },
);

export const FollowController = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCountsController,
  getMyFollowCountsController,
  getMyFollowerFollowingList,
};
