import crypto from 'crypto';
import Conversation from './models/conversation.model.js';

const activeCalls = new Map(); 
const userActiveCallMap = new Map(); 

const RING_TIMEOUT_MS = 30_000;

const getOtherPartyId = (call, userId) => (call.callerId === userId ? call.calleeId : call.callerId);

const cleanupCall = (callId) => {
  const call = activeCalls.get(callId);
  if (!call) return;
  if (call.timeoutHandle) clearTimeout(call.timeoutHandle);
  userActiveCallMap.delete(call.callerId);
  userActiveCallMap.delete(call.calleeId);
  activeCalls.delete(callId);
};

export const registerCallHandlers = (io, socket, getReceiverSocketId) => {
  const userId = socket.data.userId;
  
  socket.on('call:invite', async ({ conversationId, calleeId, callType }, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {};
    try {
      if (!conversationId || !calleeId) {
        return respond({ error: 'invalid_request', message: 'Missing conversation or callee' });
      }

      const resolvedCallType = callType === 'video' ? 'video' : 'voice';

      if (userActiveCallMap.has(userId)) {
        return respond({ error: 'busy', message: 'You are already in a call' });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        isGroup: false,
        participants: { $all: [userId, calleeId] },
      }).select('_id').lean();

      if (!conversation) {
        return respond({ error: 'not_found', message: 'Conversation not found' });
      }

      const calleeSocketId = getReceiverSocketId(calleeId);
      if (!calleeSocketId) {
        return respond({ error: 'offline', message: `${calleeId} is offline` });
      }

      if (userActiveCallMap.has(calleeId)) {
        return respond({ error: 'busy', message: 'User is on another call' });
      }

      const callId = crypto.randomUUID();

      const timeoutHandle = setTimeout(() => {
        const call = activeCalls.get(callId);
        if (!call || call.status !== 'ringing') return;

        const callerSocketId = getReceiverSocketId(call.callerId);
        io.to(calleeSocketId).emit('call:ended', { callId, reason: 'timeout' });
        if (callerSocketId) io.to(callerSocketId).emit('call:ended', { callId, reason: 'timeout' });
        cleanupCall(callId);
      }, RING_TIMEOUT_MS);

      activeCalls.set(callId, {
        callId,
        conversationId,
        callerId: userId,
        calleeId,
        callType: resolvedCallType,
        status: 'ringing',
        timeoutHandle,
      });
      userActiveCallMap.set(userId, callId);
      userActiveCallMap.set(calleeId, callId);

      io.to(calleeSocketId).emit('call:incoming', {
        callId,
        conversationId,
        callType: resolvedCallType,
        caller: { _id: userId, username: socket.data.username },
      });

      respond({ callId });
    } catch (error) {
      console.error('Error in call:invite:', error.message);
      respond({ error: 'server_error', message: 'Failed to start call' });
    }
  });

  socket.on('call:respond', ({ callId, accept }, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {};
    const call = activeCalls.get(callId);

    if (!call || call.calleeId !== userId) {
      return respond({ error: 'not_found' });
    }
    if (call.status !== 'ringing') {
      return respond({ error: 'invalid_state' });
    }

    if (call.timeoutHandle) clearTimeout(call.timeoutHandle);
    const callerSocketId = getReceiverSocketId(call.callerId);

    if (!accept) {
      if (callerSocketId) io.to(callerSocketId).emit('call:rejected', { callId });
      cleanupCall(callId);
      return respond({ ok: true });
    }

    call.status = 'active';
    if (callerSocketId) io.to(callerSocketId).emit('call:accepted', { callId });
    respond({ ok: true });
  });

  socket.on('call:sdp', ({ callId, description }) => {
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== userId && call.calleeId !== userId)) return;

    const otherPartyId = getOtherPartyId(call, userId);
    const socketId = getReceiverSocketId(otherPartyId);
    if (socketId) io.to(socketId).emit('call:sdp', { callId, description });
  });

  socket.on('call:ice-candidate', ({ callId, candidate }) => {
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== userId && call.calleeId !== userId)) return;

    const otherPartyId = getOtherPartyId(call, userId);
    const socketId = getReceiverSocketId(otherPartyId);
    if (socketId) io.to(socketId).emit('call:ice-candidate', { callId, candidate });
  });

  socket.on('call:media-state', ({ callId, audio, video }) => {
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== userId && call.calleeId !== userId)) return;

    const otherPartyId = getOtherPartyId(call, userId);
    const socketId = getReceiverSocketId(otherPartyId);
    if (socketId) io.to(socketId).emit('call:media-state', { callId, audio, video });
  });

  socket.on('call:end', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== userId && call.calleeId !== userId)) return;

    const otherPartyId = getOtherPartyId(call, userId);
    const socketId = getReceiverSocketId(otherPartyId);
    if (socketId) io.to(socketId).emit('call:ended', { callId, reason: 'hangup' });
    cleanupCall(callId);
  });

  socket.on('disconnect', () => {
    const callId = userActiveCallMap.get(userId);
    if (!callId) return;

    const call = activeCalls.get(callId);
    if (!call) return;

    const otherPartyId = getOtherPartyId(call, userId);
    const socketId = getReceiverSocketId(otherPartyId);
    if (socketId) io.to(socketId).emit('call:ended', { callId, reason: 'peer-disconnected' });
    cleanupCall(callId);
  });
};
