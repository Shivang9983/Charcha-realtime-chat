import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { getReceiverSocketId, io } from '../socket.js';

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username email avatar')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'username avatar',
        },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error in getConversations:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username email avatar')
      .sort({ createdAt: 1 });

    // Update read receipts
    let updated = false;
    for (let msg of messages) {
      if (msg.sender._id.toString() !== userId.toString() && !msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
        await msg.save();
        updated = true;
      }
    }

    if (updated) {
      io.to(conversationId.toString()).emit('messagesRead', {
        conversationId,
        readBy: userId,
      });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error in getMessages:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const { id: conversationId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const newMessage = new Message({
      sender: senderId,
      conversationId,
      content,
      readBy: [senderId],
    });

    await newMessage.save();

    conversation.latestMessage = newMessage._id;
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id).populate(
      'sender',
      'username email avatar'
    );

    // Emit event to the socket room
    io.to(conversationId.toString()).emit('newMessage', populatedMessage);

    // Broadcast updated conversation state for the sidebar previews
    conversation.participants.forEach((partId) => {
      const socketId = getReceiverSocketId(partId.toString());
      if (socketId) {
        io.to(socketId).emit('conversationUpdate', {
          conversationId,
          latestMessage: populatedMessage,
          updatedAt: conversation.updatedAt,
        });
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error in sendMessage:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const startConversation = async (req, res) => {
  try {
    const { userId, isGroup, groupName, participants } = req.body;
    const currentUserId = req.user._id;

    if (isGroup) {
      if (!groupName || !participants || participants.length === 0) {
        return res.status(400).json({ error: 'Group name and participants are required' });
      }

      const allParticipants = Array.from(new Set([...participants, currentUserId.toString()]));

      const newConversation = new Conversation({
        participants: allParticipants,
        isGroup: true,
        groupName,
        groupAdmin: currentUserId,
      });

      await newConversation.save();

      const populatedConv = await Conversation.findById(newConversation._id).populate(
        'participants',
        'username email avatar'
      );

      // Notify all connected group participants about the new conversation
      allParticipants.forEach((partId) => {
        const socketId = getReceiverSocketId(partId);
        if (socketId) {
          io.to(socketId).emit('newConversation', populatedConv);
        }
      });

      return res.status(201).json(populatedConv);
    } else {
      if (!userId) {
        return res.status(400).json({ error: 'Participant userId is required' });
      }

      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [currentUserId, userId] },
      })
        .populate('participants', 'username email avatar')
        .populate('latestMessage');

      if (conversation) {
        return res.status(200).json(conversation);
      }

      conversation = new Conversation({
        participants: [currentUserId, userId],
        isGroup: false,
      });

      await conversation.save();

      const populatedConv = await Conversation.findById(conversation._id).populate(
        'participants',
        'username email avatar'
      );

      // Notify both participants
      populatedConv.participants.forEach((p) => {
        const socketId = getReceiverSocketId(p._id.toString());
        if (socketId) {
          io.to(socketId).emit('newConversation', populatedConv);
        }
      });

      res.status(201).json(populatedConv);
    }
  } catch (error) {
    console.error('Error in startConversation:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
