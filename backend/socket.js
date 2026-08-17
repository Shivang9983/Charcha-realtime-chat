import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { parse as parseCookie } from 'cookie';

import { verifyAuthToken } from './middleware/auth.middleware.js';
import Conversation from './models/conversation.model.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Map of userId -> socketId
const userSocketMap = {};

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

export const getOnlineUserIds = () => {
  return Object.keys(userSocketMap);
};

// Authenticate every socket handshake against the same httpOnly JWT cookie the
// REST API trusts. A client-supplied identity (e.g. handshake.query.userId) is
// never trusted - without this, any client could claim to be any user, appear
// online as them, and receive their direct events.
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = cookieHeader ? parseCookie(cookieHeader).jwt : null;

    const user = await verifyAuthToken(token);
    if (!user) {
      return next(new Error('Unauthorized'));
    }

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { userId, username } = socket.data;
  console.log('A user connected:', socket.id, 'user:', userId);

  userSocketMap[userId] = socket.id;
  io.emit('getOnlineUsers', Object.keys(userSocketMap));

  // Join a room for a specific conversation - only if the socket's authenticated
  // user is actually a participant, otherwise this would let anyone eavesdrop on
  // any conversation's real-time events just by guessing its id.
  socket.on('joinConversation', async (conversationId) => {
    try {
      const isParticipant = await Conversation.exists({
        _id: conversationId,
        participants: userId,
      });
      if (!isParticipant) return;

      socket.join(conversationId);
    } catch (error) {
      console.error('Error joining conversation room:', error.message);
    }
  });

  // Leave conversation room
  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
  });

  // Relay typing status to others in the room. Identity comes from the verified
  // socket, never from the event payload, so a client can't spoof another user's
  // typing indicator.
  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('typing', { conversationId, userId, username });
  });

  // Relay stop typing status
  socket.on('stopTyping', ({ conversationId }) => {
    socket.to(conversationId).emit('stopTyping', { conversationId, userId });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Only clear the map entry if it still points at this socket - otherwise a
    // stale tab disconnecting could wipe out a newer, still-live connection for
    // the same user (e.g. multiple tabs/devices).
    if (userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });
});

export { app, io, server };
