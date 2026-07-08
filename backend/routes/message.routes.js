import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
} from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/conversations', protectRoute, getConversations);
router.post('/conversations', protectRoute, startConversation);
router.get('/:id', protectRoute, getMessages);
router.post('/send/:id', protectRoute, sendMessage);

export default router;
