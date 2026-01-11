// import { Server } from 'http';
// import { WebSocket, WebSocketServer } from 'ws';
// import { verifyToken } from '../utils/verifyToken';
// import config from '../../config';
// import { Secret } from 'jsonwebtoken';
// import { prisma } from '../utils/prisma';

// interface ExtendedWebSocket extends WebSocket {
//   userId?: string;
//   role?: 'USER';
// }

// export const onlineUsers = new Set<string>();
// const userSockets = new Map<string, ExtendedWebSocket>();
// const clients = new Map<
//   string,
//   { ws: ExtendedWebSocket; userId: string; role: 'USER' }
// >();

// export async function setupWebSocket(server: Server) {
//   const wss = new WebSocketServer({ server });


//   wss.on('connection', (ws: ExtendedWebSocket) => {
//     console.log('New user connected');

//     ws.on('message', async (data: string) => {
//       try {
//         const parsedData = JSON.parse(data);
//         switch (parsedData.event) {
//           case 'authenticate': {
//             const token = parsedData.token;

//             if (!token) {
//               console.log('No token provided');
//               ws.close();
//               return;
//             }

//             const user = verifyToken(token, config.jwt.access_secret as Secret);

//             if (!user) {
//               console.log('Invalid token');
//               ws.close();
//               return;
//             }

//             const { id } = user;

//             ws.userId = id;
//             ws.role = user.role as 'USER';
//             onlineUsers.add(id);

//             userSockets.set(id, ws);

//             broadcastToAll(wss, {
//               event: 'userStatus',
//               data: { userId: id, isOnline: true },
//             });
//             break;
//           }
//           // One-to-One Message
//           case 'message': {
//             const { receiverId, message } = parsedData;

//             if (!ws.userId || !receiverId || !message) {
//               console.log('Invalid message payload');
//               return;
//             }

//             let room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               room = await prisma.room.create({
//                 data: { senderId: ws.userId, receiverId },
//               });
//             }

//             const chat = await prisma.chat.create({
//               data: {
//                 senderId: ws.userId,
//                 receiverId,
//                 roomId: room.id,
//                 message,
//               },
//             });

//             const receiverSocket = userSockets.get(receiverId);
//             if (receiverSocket) {
//               receiverSocket.send(
//                 JSON.stringify({ event: 'message', data: chat }),
//               );
//             }
//             ws.send(JSON.stringify({ event: 'message', data: chat }));
//             break;
//           }
//           // Free Style One-to-One Message (if needed for distinction)
//           case 'freeStyleMessage': {
//             const { receiverId, message } = parsedData;

//             if (!ws.userId || !receiverId || !message) {
//               console.log('Invalid message payload');
//               return;
//             }

//             let room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               room = await prisma.room.create({
//                 data: { senderId: ws.userId, receiverId },
//               });
//             }

//             const chat = await prisma.chat.create({
//               data: {
//                 senderId: ws.userId,
//                 receiverId,
//                 roomId: room.id,
//                 message,
//               },
//             });

//             const receiverSocket = userSockets.get(receiverId);
//             if (receiverSocket) {
//               receiverSocket.send(
//                 JSON.stringify({ event: 'freeStyleMessage', data: chat }),
//               );
//             }
//             ws.send(JSON.stringify({ event: 'freeStyleMessage', data: chat }));
//             break;
//           }
//           // Project (placeholder)
//           case 'project': {
//             ws.send(JSON.stringify({ parsedData }));
//             return;
//           }
//           // Fetch One-to-One Chats
//           case 'fetchChats': {
//             const { receiverId } = parsedData;
//             if (!ws.userId) {
//               console.log('User not authenticated');
//               return;
//             }

//             const room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               ws.send(JSON.stringify({ event: 'fetchChats', data: [] }));
//               return;
//             }

//             const chats = await prisma.chat.findMany({
//               where: { roomId: room.id },
//               orderBy: { createdAt: 'asc' },
//             });

//             await prisma.chat.updateMany({
//               where: { roomId: room.id, receiverId: ws.userId },
//               data: { isRead: true },
//             });

//             ws.send(
//               JSON.stringify({
//                 event: 'fetchChats',
//                 data: chats,
//               }),
//             );
//             break;
//           }
//           // Free Style Fetch One-to-One Chats
//           case 'freeStyleFetchChats': {
//             const { receiverId } = parsedData;
//             if (!ws.userId) {
//               console.log('User not authenticated');
//               return;
//             }

//             const room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               ws.send(
//                 JSON.stringify({ event: 'freeStyleFetchChats', data: [] }),
//               );
//               return;
//             }

//             const chats = await prisma.chat.findMany({
//               where: { roomId: room.id },
//               orderBy: { createdAt: 'asc' },
//             });

//             await prisma.chat.updateMany({
//               where: { roomId: room.id, receiverId: ws.userId },
//               data: { isRead: true },
//             });

//             ws.send(
//               JSON.stringify({
//                 event: 'freeStyleFetchChats',
//                 data: chats,
//               }),
//             );
//             break;
//           }
//           // Online Users
//           case 'onlineUsers': {
//             const onlineUserList = Array.from(onlineUsers);
//             const user = await prisma.user.findMany({
//               where: { id: { in: onlineUserList } },
//               select: {
//                 id: true,
//                 email: true,
//                 role: true,
//               },
//             });
//             ws.send(
//               JSON.stringify({
//                 event: 'onlineUsers',
//                 data: user,
//               }),
//             );
//             break;
//           }
//           // Unread One-to-One Messages
//           case 'unReadMessages': {
//             const { receiverId } = parsedData;
//             if (!ws.userId || !receiverId) {
//               console.log('Invalid unread messages payload');
//               return;
//             }

//             const room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               ws.send(JSON.stringify({ event: 'noUnreadMessages', data: [] }));
//               return;
//             }

//             const unReadMessages = await prisma.chat.findMany({
//               where: { roomId: room.id, isRead: false, receiverId: ws.userId },
//             });

//             const unReadCount = unReadMessages.length;

//             ws.send(
//               JSON.stringify({
//                 event: 'unReadMessages',
//                 data: { messages: unReadMessages, count: unReadCount },
//               }),
//             );
//             break;
//           }
//           // Free Style Unread One-to-One Messages
//           case 'freeStyleUnReadMessages': {
//             const { receiverId } = parsedData;
//             if (!ws.userId || !receiverId) {
//               console.log('Invalid unread messages payload');
//               return;
//             }

//             const room = await prisma.room.findFirst({
//               where: {
//                 OR: [
//                   { senderId: ws.userId, receiverId },
//                   { senderId: receiverId, receiverId: ws.userId },
//                 ],
//               },
//             });

//             if (!room) {
//               ws.send(
//                 JSON.stringify({
//                   event: 'noFreeStyleUnReadMessages',
//                   data: [],
//                 }),
//               );
//               return;
//             }

//             const unReadMessages = await prisma.chat.findMany({
//               where: { roomId: room.id, isRead: false, receiverId: ws.userId },
//             });

//             const unReadCount = unReadMessages.length;

//             ws.send(
//               JSON.stringify({
//                 event: 'freeStyleUnReadMessages',
//                 data: { messages: unReadMessages, count: unReadCount },
//               }),
//             );
//             break;
//           }
//           // One-to-One Message List
//           case 'messageList': {
//             try {
//               const rooms = await prisma.room.findMany({
//                 where: {
//                   OR: [{ senderId: ws.userId }, { receiverId: ws.userId }],
//                 },
//                 include: {
//                   chat: {
//                     orderBy: {
//                       createdAt: 'desc',
//                     },
//                     take: 1,
//                   },
//                 },
//               });

//               const userIds = rooms.map(room => {
//                 return room.senderId === ws.userId
//                   ? room.receiverId
//                   : room.senderId;
//               });

//               const userInfos = await prisma.user.findMany({
//                 where: {
//                   id: {
//                     in: userIds,
//                   },
//                 },
//                 select: {
//                   id: true,
//                   fullName: true,
//                   email: true,
//                   role: true,
//                 },
//               });

//               const userWithLastMessages = rooms.map(room => {
//                 const otherUserId =
//                   room.senderId === ws.userId ? room.receiverId : room.senderId;
//                 const userInfo = userInfos.find(
//                   userInfo => userInfo.id === otherUserId,
//                 );

//                 return {
//                   user: userInfo || null,
//                   lastMessage: room.chat[0] || null,
//                 };
//               });

//               ws.send(
//                 JSON.stringify({
//                   event: 'messageList',
//                   data: userWithLastMessages,
//                 }),
//               );
//             } catch (error) {
//               console.error(
//                 'Error fetching user list with last messages:',
//                 error,
//               );
//               ws.send(
//                 JSON.stringify({
//                   event: 'error',
//                   message: 'Failed to fetch users with last messages',
//                 }),
//               );
//             }
//             break;
//           }
//           // Community - Create Community
//           case 'createCommunity': {
//             const { name, description, memberIds, image } = parsedData;
//             if (
//               !ws.userId ||
//               !name ||
//               !Array.isArray(memberIds) ||
//               memberIds.length === 0
//             ) {
//               console.log('Invalid createCommunity payload');
//               return;
//             }
//             // Create the community
//             const community = await prisma.community.create({
//               data: {
//                 name,
//                 description: description || '',
//                 image: image || null,
//                 userId: ws.userId,
//                 users: {
//                   create: [
//                     { userId: ws.userId },
//                     ...memberIds.map((id: string) => ({
//                       userId: id,
//                     })),
//                   ],
//                 },
//               },
//               include: { users: true },
//             });

//             // Notify all members (if online) about the new community
//             const allMemberIds = [ws.userId, ...memberIds];
//             allMemberIds.forEach(id => {
//               const memberSocket = userSockets.get(id);
//               if (memberSocket) {
//                 memberSocket.send(
//                   JSON.stringify({
//                     event: 'communityCreated',
//                     data: community,
//                   }),
//                 );
//               }
//             });

//             break;
//           }
//           // Join Community
//           case 'joinCommunity': {
//             const { communityId } = parsedData;
//             if (!ws.userId || !communityId) return;

//             // Check if already a member or left
//             const existingMember = await prisma.communityMembers.findFirst({
//               where: { communityId, userId: ws.userId },
//             });

//             if (existingMember) {
//               if (existingMember.isLeft) {
//                 // Rejoin by setting isLeft to false
//                 await prisma.communityMembers.update({
//                   where: { id: existingMember.id },
//                   data: { isLeft: false },
//                 });
//               }
//             } else {
//               // Add new member
//               await prisma.communityMembers.create({
//                 data: { communityId, userId: ws.userId },
//               });
//             }

//             ws.send(
//               JSON.stringify({ event: 'joinCommunity', data: { communityId } }),
//             );
//             break;
//           }
//           // Leave Community
//           case 'leaveCommunity': {
//             const { communityId } = parsedData;
//             if (!ws.userId || !communityId) return;

//             const member = await prisma.communityMembers.findFirst({
//               where: { communityId, userId: ws.userId },
//             });

//             if (member) {
//               await prisma.communityMembers.update({
//                 where: { id: member.id },
//                 data: { isLeft: true },
//               });
//             }

//             ws.send(
//               JSON.stringify({
//                 event: 'leaveCommunity',
//                 data: { communityId },
//               }),
//             );
//             break;
//           }
//           // Community Message
//           case 'communityMessage': {
//             const { communityId, message } = parsedData;

//             if (!ws.userId || !communityId || !message) {
//               console.log('Invalid community message payload');
//               return;
//             }

//             // Check if user is a member and not left
//             const member = await prisma.communityMembers.findFirst({
//               where: {
//                 communityId,
//                 userId: ws.userId,
//                 isLeft: false,
//               },
//             });

//             if (!member) {
//               console.log('User not a member of community');
//               return;
//             }

//             // Save the message
//             const communityMessage = await prisma.communityMessage.create({
//               data: {
//                 senderId: ws.userId,
//                 communityId,
//                 message,
//               },
//             });

//             // Fetch all active members of the community
//             const members = await prisma.communityMembers.findMany({
//               where: { communityId, isLeft: false },
//               select: { userId: true },
//             });

//             // Send message to all online active members
//             members.forEach(({ userId }) => {
//               const memberSocket = userSockets.get(userId as string);
//               if (memberSocket) {
//                 memberSocket.send(
//                   JSON.stringify({
//                     event: 'communityMessage',
//                     data: communityMessage,
//                   }),
//                 );
//               }
//             });
//             break;
//           }
//           // Fetch Community Chats
//           case 'fetchCommunityChats': {
//             const { communityId } = parsedData;
//             if (!ws.userId || !communityId) {
//               console.log('Invalid fetchCommunityChats payload');
//               return;
//             }

//             // Check membership
//             const member = await prisma.communityMembers.findFirst({
//               where: {
//                 communityId,
//                 userId: ws.userId,
//                 isLeft: false,
//               },
//             });

//             if (!member) {
//               console.log('User not a member of community');
//               return;
//             }

//             const chats = await prisma.communityMessage.findMany({
//               where: { communityId },
//               orderBy: { createdAt: 'asc' },
//             });

//             // Mark as read for this user (update isRead or create read status)
//             await prisma.communityMessage.updateMany({
//               where: {
//                 communityId,
//                 senderId: { not: ws.userId },
//                 isRead: false,
//               },
//               data: { isRead: true },
//             });

//             // Create read statuses for new messages if needed
//             const unreadChats = chats.filter(
//               chat => chat.senderId !== ws.userId && !chat.isRead,
//             );
//             for (const chat of unreadChats) {
//               await prisma.communityMessageReadStatus.upsert({
//                 where: {
//                   messageId_userId: { messageId: chat.id, userId: ws.userId },
//                 },
//                 create: { messageId: chat.id, userId: ws.userId },
//                 update: {},
//               });
//             }

//             ws.send(
//               JSON.stringify({ event: 'fetchCommunityChats', data: chats }),
//             );
//             break;
//           }
//           // Community Unread Messages
//           case 'communityUnReadMessages': {
//             const { communityId } = parsedData;
//             if (!ws.userId || !communityId) return;

//             // Check membership
//             const member = await prisma.communityMembers.findFirst({
//               where: {
//                 communityId,
//                 userId: ws.userId,
//                 isLeft: false,
//               },
//             });

//             if (!member) return;

//             const unreadMessages = await prisma.communityMessage.findMany({
//               where: {
//                 communityId,
//                 senderId: { not: ws.userId },
//                 isRead: false,
//               },
//             });

//             ws.send(
//               JSON.stringify({
//                 event: 'communityUnReadMessages',
//                 data: {
//                   messages: unreadMessages,
//                   count: unreadMessages.length,
//                 },
//               }),
//             );
//             break;
//           }
//           // Community Message List
//           case 'communityMessageList': {
//             if (!ws.userId) return;
//             // Fetch all communities where the user is an active member
//             const communities = await prisma.communityMembers.findMany({
//               where: { userId: ws.userId, isLeft: false },
//               include: {
//                 community: {
//                   include: {
//                     communityMessages: {
//                       orderBy: { createdAt: 'desc' },
//                       take: 1, // last message
//                     },
//                   },
//                 },
//               },
//             });
//             const communityList = communities.map(member => ({
//               communityId: member.community.id,
//               communityName: member.community.name,
//               description: member.community.description,
//               image: member.community.image,
//               lastMessage: member.community.communityMessages[0] || null,
//             }));

//             ws.send(
//               JSON.stringify({
//                 event: 'communityMessageList',
//                 data: communityList,
//               }),
//             );
//             break;
//           }
//           // Group Chat Events (kept as is for completeness)
//           case 'createGroup': {
//             const { name, memberIds } = parsedData;
//             console.log(ws.userId);
//             if (
//               !ws.userId ||
//               !name ||
//               !Array.isArray(memberIds) ||
//               memberIds.length === 0
//             ) {
//               console.log('Invalid createGroup payload');
//               return;
//             }
//             const group = await prisma.groupRoom.create({
//               data: {
//                 name,
//                 createdBy: ws.userId,
//                 members: {
//                   create: [
//                     { userId: ws.userId, role: 'admin' },
//                     ...memberIds.map((id: string) => ({
//                       userId: id,
//                       role: 'member',
//                     })),
//                   ],
//                 },
//               },
//               include: { members: true },
//             });

//             const allMemberIds = [ws.userId, ...memberIds];
//             allMemberIds.forEach(id => {
//               const memberSocket = userSockets.get(id);
//               if (memberSocket) {
//                 memberSocket.send(
//                   JSON.stringify({ event: 'groupCreated', data: group }),
//                 );
//               }
//             });

//             break;
//           }
//           case 'joinGroup': {
//             const { groupId } = parsedData;
//             if (!ws.userId || !groupId) return;

//             await prisma.groupMember.upsert({
//               where: { id: `${groupId}_${ws.userId}` },
//               create: { groupId, userId: ws.userId },
//               update: {},
//             });

//             ws.send(JSON.stringify({ event: 'joinGroup', data: { groupId } }));
//             break;
//           }
//           case 'leaveGroup': {
//             const { groupId } = parsedData;
//             if (!ws.userId || !groupId) return;

//             await prisma.groupMember.deleteMany({
//               where: { groupId, userId: ws.userId },
//             });

//             ws.send(JSON.stringify({ event: 'leaveGroup', data: { groupId } }));
//             break;
//           }
//           case 'groupMessage': {
//             const { groupId, message } = parsedData;

//             if (!ws.userId || !groupId || !message) {
//               console.log('Invalid group message payload');
//               return;
//             }

//             const groupChat = await prisma.groupChat.create({
//               data: {
//                 senderId: ws.userId,
//                 groupId,
//                 message,
//               },
//             });

//             const members = await prisma.groupMember.findMany({
//               where: { groupId },
//               select: { userId: true },
//             });

//             members.forEach(({ userId }) => {
//               const memberSocket = userSockets.get(userId);
//               if (memberSocket) {
//                 memberSocket.send(
//                   JSON.stringify({ event: 'groupMessage', data: groupChat }),
//                 );
//               }
//             });
//             break;
//           }
//           case 'fetchGroupChats': {
//             const { groupId } = parsedData;
//             if (!ws.userId || !groupId) {
//               console.log('Invalid fetchGroupChats payload');
//               return;
//             }

//             const chats = await prisma.groupChat.findMany({
//               where: { groupId },
//               orderBy: { createdAt: 'asc' },
//             });

//             await prisma.groupChat.updateMany({
//               where: { groupId, senderId: { not: ws.userId }, isRead: false },
//               data: { isRead: true },
//             });

//             ws.send(JSON.stringify({ event: 'fetchGroupChats', data: chats }));
//             break;
//           }
//           case 'groupUnReadMessages': {
//             const { groupId } = parsedData;
//             if (!ws.userId || !groupId) return;

//             const unreadMessages = await prisma.groupChat.findMany({
//               where: { groupId, senderId: { not: ws.userId }, isRead: false },
//             });

//             ws.send(
//               JSON.stringify({
//                 event: 'groupUnReadMessages',
//                 data: {
//                   messages: unreadMessages,
//                   count: unreadMessages.length,
//                 },
//               }),
//             );
//             break;
//           }
//           case 'groupMessageList': {
//             if (!ws.userId) return;
//             const groups = await prisma.groupMember.findMany({
//               where: { userId: ws.userId },
//               include: {
//                 group: {
//                   include: {
//                     chats: {
//                       orderBy: { createdAt: 'desc' },
//                       take: 1,
//                     },
//                   },
//                 },
//               },
//             });
//             const groupList = groups.map(member => ({
//               groupId: member.group.id,
//               groupName: member.group.name,
//               lastMessage: member.group.chats[0] || null,
//             }));

//             ws.send(
//               JSON.stringify({
//                 event: 'groupMessageList',
//                 data: groupList,
//               }),
//             );
//             break;
//           }
//           default:
//             console.log('Unknown event type:', parsedData.event);
//         }
//       } catch (error) {
//         console.error('Error handling WebSocket message:', error);
//       }
//     });

//     ws.on('close', async () => {
//       const extendedWs = ws as ExtendedWebSocket;
//       if (extendedWs.userId) {
//         const userId = extendedWs.userId;
//         const role = extendedWs.role;

//         onlineUsers.delete(userId);
//         userSockets.delete(userId);
//         broadcastToAll(wss, {
//           event: 'userStatus',
//           data: { userId: userId, role: role, isOnline: false },
//         });
//       }
//       console.log('User disconnected');
//     });
//   });

//   return wss;
// }

// function broadcastToAll(wss: WebSocketServer, message: object) {
//   wss.clients.forEach(client => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(message));
//     }
//   });
// }
