import express from 'express';
import { createFeedback, getAllFeedback, getPublicFeedback, approveFeedback, deleteFeedback } from '../controllers/feedbackController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Authenticated routes
router.route('/')
    .post(auth, authorize('customer'), createFeedback)
    .get(auth, authorize('admin'), getAllFeedback);

router.route('/:id/approve').put(auth, authorize('admin'), approveFeedback);
router.route('/:id').delete(auth, authorize('admin'), deleteFeedback);

// Public route
router.get('/public', getPublicFeedback);

export default router;