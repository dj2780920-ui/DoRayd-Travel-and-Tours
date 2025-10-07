import express from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(auth, getMyNotifications);

router.route('/:id/read')
  .patch(auth, markAsRead);

export default router;