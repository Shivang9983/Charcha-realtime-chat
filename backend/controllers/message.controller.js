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

    const messages = await Message.find({ conversationId, deletedFor: { $ne: userId } })
      .populate('sender', 'username email avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username',
        },
      })
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
    const { content, replyTo } = req.body;
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
      replyTo: replyTo || null,
    });

    await newMessage.save();

    conversation.latestMessage = newMessage._id;
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username email avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username',
        },
      });

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

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    const timeDiff = Date.now() - new Date(message.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (timeDiff > fifteenMinutes) {
      return res.status(400).json({ error: 'Messages can only be edited within 15 minutes of sending' });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username email avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username',
        },
      });

    // Emit socket event to the conversation room
    io.to(message.conversationId.toString()).emit('messageUpdated', populatedMessage);

    // Update conversation latest message if needed
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && conversation.latestMessage && conversation.latestMessage.toString() === message._id.toString()) {
      conversation.participants.forEach((partId) => {
        const socketId = getReceiverSocketId(partId.toString());
        if (socketId) {
          io.to(socketId).emit('conversationUpdate', {
            conversationId: conversation._id,
            latestMessage: populatedMessage,
            updatedAt: conversation.updatedAt,
          });
        }
      });
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error('Error in editMessage:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteType } = req.body; // 'me' or 'everyone'
    const userId = req.user._id;

    if (!['me', 'everyone'].includes(deleteType)) {
      return res.status(400).json({ error: 'Invalid delete type. Must be "me" or "everyone"' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Access denied or conversation not found' });
    }

    if (deleteType === 'everyone') {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Unauthorized to delete this message for everyone' });
      }

      message.isDeleted = true;
      message.content = 'This message was deleted';
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username email avatar')
        .populate({
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'username',
          },
        });

      // Emit socket event to the conversation room
      io.to(message.conversationId.toString()).emit('messageUpdated', populatedMessage);

      // Update conversation latest message if needed
      if (conversation.latestMessage && conversation.latestMessage.toString() === message._id.toString()) {
        conversation.participants.forEach((partId) => {
          const socketId = getReceiverSocketId(partId.toString());
          if (socketId) {
            io.to(socketId).emit('conversationUpdate', {
              conversationId: conversation._id,
              latestMessage: populatedMessage,
              updatedAt: conversation.updatedAt,
            });
          }
        });
      }

      res.status(200).json(populatedMessage);
    } else {
      // deleteType === 'me'
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      res.status(200).json({ success: true, messageId });
    }
  } catch (error) {
    console.error('Error in deleteMessage:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
