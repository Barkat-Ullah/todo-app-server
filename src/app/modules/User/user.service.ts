import httpStatus from 'http-status';
import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';

import { Request } from 'express';
import AppError from '../../errors/AppError';
import { fileUploader } from '../../utils/fileUploader';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
const getAllUsersFromDB = async (query: any) => {
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query);
  usersQuery.where({ role: 'USER' });
  const result = await usersQuery
    .search(['fullName', 'email', 'address', 'city'])
    .filter()
    .sort()
    .fields()
    .exclude()
    .paginate()
    .execute();
  return result;
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
      profile: true,
    },
  });

  return Profile;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
      profile: true,
      clientInfo: true,
    },
  });
  return user;
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum) => {
  const result = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: role,
    },
  });
  return result;
};
const updateUserStatus = async (id: string, status: UserStatus) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status,
    },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });
  return result;
};
const updateUserApproval = async (userId: string) => {
  console.log(userId);
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  //   select: {
  //     id: true,
  //     fullName: true,
  //     email: true,
  //     isApproved: true,
  //   },
  // });

  // if (!user) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // const result = await prisma.user.update({
  //   where: { id: userId },
  //   data: {
  //     isApproved: true,
  //   },
  // });
  // return result;
};

const softDeleteUserIntoDB = async (id: string) => {
  const result = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    select: {
      id: true,
      isDeleted: true,
    },
  });
  return result;
};
const hardDeleteUserIntoDB = async (id: string, adminId: string) => {
  // const adminUser = await prisma.user.findUnique({
  //   where: {
  //     id: adminId,
  //     role: UserRoleEnum.ADMIN,
  //   },
  // });
  // if (!adminUser) {
  //   throw new AppError(httpStatus.UNAUTHORIZED, 'You are not a admin');
  // }
  // return await prisma.$transaction(
  //   async tx => {
  //     // related tables delete
  //     await tx.goal.deleteMany({ where: { userId: id } });
  //     await tx.message.deleteMany({ where: { senderId: id } });
  //     await tx.message.deleteMany({ where: { receiverId: id } });
  //     await tx.payment.deleteMany({ where: { userId: id } });
  //     await tx.motivation.deleteMany({ where: { userId: id } });
  //     await tx.notificationUser.deleteMany({ where: { userId: id } });
  //     await tx.vision.deleteMany({ where: { userId: id } });
  //     await tx.community.deleteMany({ where: { userId: id } });
  //     await tx.communityMembers.deleteMany({ where: { userId: id } });
  //     await tx.follow.deleteMany({
  //       where: {
  //         OR: [{ followerId: id }, { followingId: id }],
  //       },
  //     });
  //     const deletedUser = await tx.user.delete({
  //       where: { id },
  //       select: { id: true, email: true },
  //     });
  //     return deletedUser;
  //   },
  //   {
  //     timeout: 20000,
  //     maxWait: 5000,
  //   },
  // );
};

const updateUserIntoDb = async (req: Request, id: string) => {
  // Step 1️⃣: Check if user exists
  const userInfo = await prisma.user.findUnique({
    where: { id },
  });

  if (!userInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with id: ' + id);
  }

  // Step 2️⃣: Parse incoming data
  const { fullName, describe, city, address, phoneNumber } = JSON.parse(
    req.body.data,
  );

  // Step 3️⃣: Handle file upload (optional)
  const file = req.file as Express.Multer.File | undefined;

  let profileUrl: string | null = userInfo.profile;

  if (file) {
    // const location = await fileUploader.uploadToDigitalOcean(file);
    const location = await fileUploader.uploadToCloudinary(file);
    profileUrl = location.Location;
  }

  // Step 4️⃣: Update user in DB
  const result = await prisma.user.update({
    where: { id },
    data: {
      fullName,
      // businessType,
      describe,
      city,
      address,
      phoneNumber,
      profile: profileUrl,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profile: true,
      role: true,
      // businessType: true,
      describe: true,
      city: true,
      address: true,
      status: true,
    },
  });

  if (!result) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update user profile',
    );
  }

  return result;
};

const updateMyProfileIntoDB = async (
  id: string,
  file: Express.Multer.File | undefined,
  payload: Partial<User>,
) => {
  // Prevent updating sensitive fields
  const { email, role, ...updateData } = payload;

  let profileUrl: string | null = null;
  if (file) {
    // const location = await fileUploader.uploadToDigitalOcean(file);
    const location = await fileUploader.uploadToCloudinary(file);
    profileUrl = location.Location;
    updateData.profile = profileUrl;
  }

  // Always update
  const result = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      profile: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
    },
  });

  return result;
};

export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateUserRoleStatusIntoDB,
  updateUserStatus,
  updateUserApproval,
  softDeleteUserIntoDB,
  hardDeleteUserIntoDB,
  updateUserIntoDb,
  updateMyProfileIntoDB,
};
