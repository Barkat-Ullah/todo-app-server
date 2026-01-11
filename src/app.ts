import express, { Application } from 'express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './app/routes';
import auth from './app/middlewares/auth';

import {
  apiLimiter,
  imageUpload,
  notFound,
  serverHealth,
  setupMiddlewares,
} from './shared';

import { rootHandler } from './shared/rootHandler';
import { fileUploader } from './app/utils/fileUploader';
// import { StripeWebHook } from './app/utils/StripeUtils';

const app: Application = express();

setupMiddlewares(app);

app.use('/api/v1', apiLimiter, router);

// Stripe webhook (if needed, before error handler)
app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  // StripeWebHook,
);

// Upload route (after main routes, before error handler)
app.post(
  '/api/v1/upload-image',
  auth('ANY'),
  fileUploader.uploadSingle, // "image",
  imageUpload,
);

// Root route (Better: JSON response with icon)
//* app.get('/', (req: Request, res: Response) => {
//   res.send({
//     Message: 'The server is running. . .',
//   });
// });
app.get('/', rootHandler);
app.get('/health', serverHealth);

// 404 handler (before global error)
app.use(notFound);

// Global error handler (last)
app.use(globalErrorHandler);

export default app;
