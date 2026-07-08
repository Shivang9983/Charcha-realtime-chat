import express from 'express';
import { searchUsers, updateProfile } from '../controllers/user.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/search', protectRoute, searchUsers);
router.put('/update-profile', protectRoute, updateProfile);

export default router;
