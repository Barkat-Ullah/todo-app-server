
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import catchAsync from '../app/utils/catchAsync';
import AppError from '../app/errors/AppError';

import { prisma } from '../app/utils/prisma';
import { fileUploader } from '../app/utils/fileUploader';




export const setupMiddlewares = (app: Application): void => {
  // CORS
  app.use(
    cors({
      origin: ['http://localhost:3001', 'http://localhost:3000'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Origin',
        'Cache-Control',
        'X-CSRF-Token',
        'User-Agent',
        'Content-Length',
      ],
      credentials: true,
    }),
  );

  // Body parsers
  app.use(express.json({ limit: '500mb' }));
  app.use(cookieParser());
  app.use(express.urlencoded({ limit: '500mb', extended: true }));
};

// Rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  keyGenerator: (req: any) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipArray = forwardedFor ? forwardedFor.split(/\s*,\s*/) : [];
    const ipAddress =
      ipArray.length > 0 ? ipArray[0] : req.connection.remoteAddress;
    return ipAddress;
  },
  message: {
    success: false,
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiter to main routes (in app/index.ts)
console.log('✅ Middlewares setup complete');

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'API NOT FOUND! please check on router',
    error: {
      path: req.originalUrl,
      message: 'Your requested path is not found!',
    },
  });
};

//only image upload
export const imageUpload = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No image file');
  }

  const file = req.file;
  const location = await fileUploader.uploadToDigitalOcean(file);
  const imageUrl = location.Location;

  res.status(httpStatus.OK).json({ success: true, imageUrl });
});

export const serverHealth = catchAsync(async (req: Request, res: Response) => {
  await prisma.$connect();
  res.status(httpStatus.OK).json({
    success: true,
    message: '🟢 Server healthy',
    timestamp: new Date().toISOString(),
    db: 'Connected',
  });
});
