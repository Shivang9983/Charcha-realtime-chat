import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  editMessage,
  deleteMessage,
} from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/conversations', protectRoute, getConversations);
router.post('/conversations', protectRoute, startConversation);
router.get('/:id', protectRoute, getMessages);
router.post('/send/:id', protectRoute, sendMessage);
router.put('/edit/:id', protectRoute, editMessage);
router.post('/delete/:id', protectRoute, deleteMessage);

export default router;
