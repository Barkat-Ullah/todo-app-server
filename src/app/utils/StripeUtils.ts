// import httpStatus from 'http-status';
// import AppError from '../errors/AppError';
// import catchAsync from './catchAsync';
// import sendResponse from './sendResponse';
// import Stripe from 'stripe';
// import config from '../../config';
// import { prisma } from './prisma';
// import { stripe } from './stripe';
// import { PaymentStatus, SubscriptionType } from '@prisma/client';

// export const StripeWebHook = catchAsync(async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   if (!sig) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Missing Stripe signature');
//   }

//   const result = await StripeHook(req.body, sig);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: 'Webhook processed successfully',
//     data: result,
//   });
// });

// const StripeHook = async (
//   rawBody: Buffer,
//   signature: string | string[] | undefined,
// ) => {
//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       rawBody,
//       signature as string,
//       config.stripe.stripe_webhook as string,
//     );
//   } catch (err) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       `Webhook signature verification failed: ${(err as Error).message}`,
//     );
//   }

//   switch (event.type) {
//     case 'payment_intent.succeeded': {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;

//       // Try to find a payment record first
//       const existingPayment = await prisma.payment.findUnique({
//         where: { stripePaymentId: paymentIntent.id },
//         select: { userId: true, subscriptionId: true },
//       });

//       if (existingPayment) {
//         await prisma.payment.update({
//           where: { stripePaymentId: paymentIntent.id },
//           data: {
//             status: PaymentStatus.SUCCESS,
//             amount: paymentIntent.amount,
//             stripeCustomerId: paymentIntent.customer as string,
//           },
//         });
//       } else {
//         console.log(
//           `No payment record found for PaymentIntent ${paymentIntent.id}`,
//         );
//       }
//       break;
//     }

//     case 'invoice.payment_succeeded': {
//       const invoice = event.data.object as Stripe.Invoice;
//       const stripeSubscriptionId = invoice.subscription as string | null;
//       const stripeCustomerId = invoice.customer as string | null;

//       if (!stripeSubscriptionId) {
//         console.log('Invoice has no subscription ID, skipping.');
//         break;
//       }

//       // 1. Find the local Payment record using the saved Stripe Subscription ID
//       const existingPayment = await prisma.payment.findUnique({
//         where: { stripeSubscriptionId: stripeSubscriptionId },
//         select: { id: true, userId: true, subscriptionId: true },
//       });

//       // **CRITICAL: The logic goes HERE**
//       if (existingPayment) {
//         // 2. Fetch the actual subscription details for duration
//         const subscription = await prisma.subscription.findUnique({
//           where: { id: existingPayment.subscriptionId },
//         });

//         if (subscription) {
//           // 3. Update User's subscription dates (This assumes the payment confirms the active subscription)
//           const startDate = new Date();
//           const endDate = new Date();

//           if (subscription.subscriptionType === SubscriptionType.MONTHLY) {
//             endDate.setMonth(endDate.getMonth() + subscription.duration);
//           } else if (
//             subscription.subscriptionType === SubscriptionType.YEARLY
//           ) {
//             endDate.setFullYear(endDate.getFullYear() + subscription.duration);
//           }

//           await prisma.user.update({
//             where: { id: existingPayment.userId },
//             data: {
//               subscriptionStart: startDate,
//               subscriptionEnd: endDate,
//               // Optionally: store Stripe Customer ID on User if needed
//               stripeCustomerId: stripeCustomerId,
//             },
//           });

//           // 4. Update the Payment record status (Now existingPayment.id is available)
//           await prisma.payment.update({
//             where: { id: existingPayment.id }, // No more error here!
//             data: {
//               status: PaymentStatus.SUCCESS,
//               amount: invoice.amount_paid / 100,
//               stripeCustomerId: stripeCustomerId,
//               stripePaymentId: invoice.payment_intent as string,
//             },
//           });
//         }
//       } else {
//         console.log(
//           `No payment record found for Stripe Subscription ID ${stripeSubscriptionId}. This could be a renewal/recurring invoice.`,
//         );
//       }
//       break;
//     }
//     case 'payment_intent.payment_failed': {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;
//       const sessionId = paymentIntent.metadata?.paymentId;

//       if (sessionId) {
//         await prisma.payment.update({
//           where: { id: sessionId },
//           data: { status: PaymentStatus.FAILED },
//         });
//       } else {
//         console.log('Payment failed but no session/paymentId found.');
//       }
//       break;
//     }

//     case 'checkout.session.completed': {
//       const session = event.data.object as Stripe.Checkout.Session;
//       await handleCheckoutSessionCompleted(session);
//       break;
//     }

//     case 'checkout.session.expired': {
//       const session = event.data.object as Stripe.Checkout.Session;
//       await handleCheckoutSessionCanceled(session);
//       break;
//     }

//     default:
//       console.log('Unhandled Stripe event type:', event.type);
//       return { status: 'unhandled_event', type: event.type };
//   }
// };

// // Handle one-time checkout session completion

// const handleCheckoutSessionCompleted = async (
//   session: Stripe.Checkout.Session,
// ) => {
//   const paymentId = session.metadata?.paymentId;
//   if (!paymentId) return;

//   const stripeIdToLink =
//     session.mode === 'subscription'
//       ? (session.subscription as string | undefined)
//       : (session.payment_intent as string | undefined);

//   if (!stripeIdToLink) {
//     console.log(
//       `No primary Stripe ID (Subscription/PaymentIntent) on session ${session.id}, skipping immediate update.`,
//     );
//   }

//   await prisma.payment.update({
//     where: { id: paymentId },
//     data: {
//       // Save the session ID
//       stripeSessionId: session.id,
//       // Save the subscription ID if it's a subscription
//       ...(session.mode === 'subscription' &&
//         session.subscription && {
//           stripeSubscriptionId: session.subscription as string,
//         }),
//       // Save the payment intent ID if it's a one-time payment
//       ...(session.mode === 'payment' &&
//         session.payment_intent && {
//           stripePaymentId: session.payment_intent as string,
//         }),

//       status:
//         session.mode === 'payment'
//           ? PaymentStatus.SUCCESS
//           : PaymentStatus.PENDING,
//     },
//   });

//   return await prisma.payment.findUnique({ where: { id: paymentId } });
// };

// // Handle canceled checkout sessions
// const handleCheckoutSessionCanceled = async (
//   session: Stripe.Checkout.Session,
// ) => {
//   const paymentId = session.metadata?.paymentId;
//   if (!paymentId) return;

//   await prisma.payment.update({
//     where: { id: paymentId },
//     data: {
//       status: PaymentStatus.CANCELED,
//       stripeSessionId: session.id,
//     },
//   });

//   return await prisma.payment.findUnique({ where: { id: paymentId } });
// };
