import express from 'express';
import { 
    submitReview, 
    getReviewsForItem, 
    getMyReviews,
    getAllReviews,
    approveReview,
    disapproveReview
} from '../controllers/reviewsController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

// Public routes
router.get('/item/:itemId', getReviewsForItem);

// Protected routes (require authentication)
router.post('/', auth, submitReview);
router.get('/my-reviews', auth, getMyReviews);

// Admin routes
router.get('/', auth, checkPermission('reviews', 'read'), getAllReviews);
router.patch('/:id/approve', auth, checkPermission('reviews', 'write'), approveReview);
router.patch('/:id/disapprove', auth, checkPermission('reviews', 'write'), disapproveReview);

export default router;