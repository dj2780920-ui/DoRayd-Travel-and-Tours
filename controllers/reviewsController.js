import Review from '../models/Reviews.js';
import Booking from '../models/Booking.js';

// Create a new review
export const createReview = async (req, res) => {
    try {
        const { bookingId, rating, comment, isAnonymous } = req.body;
        const booking = await Booking.findById(bookingId).populate('itemId');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only review your own bookings.' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'You can only review completed bookings.' });
        }
        
        const existingReview = await Review.findOne({ booking: bookingId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this booking.' });
        }

        const newReview = new Review({
            user: req.user.id,
            booking: bookingId,
            item: booking.itemId._id,
            itemModel: booking.itemModel,
            rating,
            comment,
            isAnonymous
        });

        await newReview.save();
        res.status(201).json({ success: true, data: newReview });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ success: false, message: 'Failed to create review.' });
    }
};

// Get reviews for the currently logged-in user
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id }).populate('item', 'title brand model');
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your reviews.' });
    }
};

// Update a review
export const updateReview = async (req, res) => {
    try {
        const { rating, comment, isAnonymous } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only update your own reviews.' });
        }

        review.rating = rating;
        review.comment = comment;
        review.isAnonymous = isAnonymous;
        review.isApproved = false; // Require re-approval after editing

        await review.save();
        res.json({ success: true, data: review });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Failed to update review.' });
    }
};

// Delete a review
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        // Allow user to delete their own, or admin to delete any
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You do not have permission to delete this review.' });
        }

        await Review.findByIdAndDelete(req.params.id);
        
        res.json({ success: true, message: 'Review deleted successfully.' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review.' });
    }
};

// Get all reviews (Admin only)
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'firstName lastName')
            .populate('item', 'title brand model');

        const validReviews = reviews.filter(review => review.user && review.item);

        res.json({ success: true, data: validReviews });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};

// Approve a review (Admin only)
export const approveReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        res.json({ success: true, data: review });
    } catch (error) {
        console.error('Error approving review:', error);
        res.status(500).json({ success: false, message: 'Failed to approve review.' });
    }
};

export const getReviewsForItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const reviews = await Review.find({ item: itemId, isApproved: true })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
            
        const validReviews = reviews.filter(review => review.user);

        res.json({ success: true, data: validReviews });
    } catch (error) {
        console.error('Error fetching reviews for item:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};