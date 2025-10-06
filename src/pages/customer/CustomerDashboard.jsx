import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Clock, 
    Car, 
    MapPin, 
    Star, 
    MessageSquare, 
    Settings, 
    User,
    Heart,
    Award
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import DataService from '../../components/services/DataService.jsx';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch user data
    const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useApi(DataService.fetchUserBookings, [user]);
    const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useApi(DataService.getMyReviews, [user]);
    const { data: feedbackData, loading: feedbackLoading, refetch: refetchFeedback } = useApi(DataService.getMyFeedback, [user]);
    const { data: publicFeedbackData, loading: publicFeedbackLoading } = useApi(DataService.getPublicFeedback, []);

    const bookings = bookingsData?.data || [];
    const myReviews = reviewsData?.data || [];
    const myFeedback = feedbackData?.data || [];
    const publicFeedback = publicFeedbackData?.data || [];

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const reviewedBookingIds = new Set(myReviews.map(r => r.booking));
    const feedbackBookingIds = new Set(myFeedback.map(f => f.booking));

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'bookings', label: 'My Bookings', icon: Calendar },
        { id: 'reviews', label: 'My Reviews', icon: Star },
        { id: 'feedback', label: 'My Feedback', icon: MessageSquare },
        { id: 'leave-review', label: 'Leave Review', icon: Award },
        { id: 'leave-feedback', label: 'Leave Feedback', icon: Heart },
        { id: 'public-feedback', label: 'Customer Feedback', icon: MessageSquare },
        { id: 'settings', label: 'Account Settings', icon: Settings }
    ];

    const stats = [
        { title: 'Total Bookings', value: bookings.length, icon: Calendar },
        { title: 'Completed', value: completedBookings.length, icon: Clock },
        { title: 'My Reviews', value: myReviews.length, icon: Star },
        { title: 'My Feedback', value: myFeedback.length, icon: MessageSquare }
    ];

    if (bookingsLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
                    <p className="text-gray-600 mt-2">Manage your bookings, reviews, and account settings</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <StatCard key={index} {...stat} />
                    ))}
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 overflow-x-auto px-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    {activeTab === 'overview' && <OverviewTab bookings={bookings} />}
                    {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
                    {activeTab === 'reviews' && <MyReviewsTab reviews={myReviews} />}
                    {activeTab === 'feedback' && <MyFeedbackTab feedback={myFeedback} />}
                    {activeTab === 'leave-review' && (
                        <LeaveReviewTab 
                            bookings={completedBookings} 
                            reviewedBookingIds={reviewedBookingIds}
                            onReviewSubmit={refetchReviews}
                        />
                    )}
                    {activeTab === 'leave-feedback' && (
                        <LeaveFeedbackTab 
                            bookings={completedBookings} 
                            feedbackBookingIds={feedbackBookingIds}
                            onFeedbackSubmit={refetchFeedback}
                        />
                    )}
                    {activeTab === 'public-feedback' && <PublicFeedbackTab feedback={publicFeedback} />}
                    {activeTab === 'settings' && <AccountSettingsTab user={user} />}
                </div>
            </div>
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
                <Icon className="w-6 h-6 text-blue-600" />
            </div>
        </div>
    </div>
);

const OverviewTab = ({ bookings }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
                <div className="space-y-3">
                    {bookings.slice(0, 3).map(booking => (
                        <div key={booking._id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{booking.itemName}</p>
                                    <p className="text-sm text-gray-500">{booking.bookingReference}</p>
                                    <p className="text-sm text-gray-500">{new Date(booking.startDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const BookingsTab = ({ bookings }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
        <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking._id} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                {booking.itemType === 'car' ? 
                                    <Car className="w-6 h-6 text-blue-600" /> : 
                                    <MapPin className="w-6 h-6 text-green-600" />
                                }
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{booking.itemName}</h3>
                                <p className="text-gray-600">Ref: {booking.bookingReference}</p>
                                <p className="text-gray-600">
                                    {new Date(booking.startDate).toLocaleDateString()}
                                    {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                                </p>
                                <p className="font-semibold text-lg mt-2">₱{booking.totalPrice.toLocaleString()}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                        </span>
                    </div>
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">You have no bookings yet.</p>
            )}
        </div>
    </div>
);

const MyReviewsTab = ({ reviews }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Reviews</h2>
        <div className="space-y-4">
            {reviews.length > 0 ? reviews.map(review => (
                <div key={review._id} className="p-6 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-semibold">{review.item?.title || `${review.item?.brand} ${review.item?.model}`}</h3>
                            <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                            </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {review.isApproved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">You haven't submitted any reviews yet.</p>
            )}
        </div>
    </div>
);

const MyFeedbackTab = ({ feedback }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Feedback</h2>
        <div className="space-y-4">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="p-6 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({item.rating}/5)</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            item.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {item.isApproved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                    <p className="text-gray-700">{item.comment}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">You haven't submitted any feedback yet.</p>
            )}
        </div>
    </div>
);

const LeaveReviewTab = ({ bookings, reviewedBookingIds, onReviewSubmit }) => {
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const availableBookings = bookings.filter(b => !reviewedBookingIds.has(b._id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBookingId || !rating || !comment.trim()) {
            alert('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            const reviewData = {
                bookingId: selectedBookingId,
                rating,
                comment: comment.trim(),
                isAnonymous
            };

            const response = await DataService.submitReview(reviewData);
            
            if (response.success) {
                alert('Review submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                setIsAnonymous(false);
                onReviewSubmit();
            } else {
                alert('Failed to submit review: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting review: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Leave a Review</h2>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select a completed booking to review *
                        </label>
                        <select 
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Choose a service to review...</option>
                            {availableBookings.map(booking => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.itemName} - {booking.bookingReference} ({new Date(booking.startDate).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating *
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star 
                                        className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Review *
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Share your experience with this service..."
                            maxLength={1000}
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">{comment.length}/1000 characters</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="anonymous-review"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="anonymous-review" className="text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            ) : (
                <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed bookings available for review.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to leave a review!</p>
                </div>
            )}
        </div>
    );
};

const LeaveFeedbackTab = ({ bookings, feedbackBookingIds, onFeedbackSubmit }) => {
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const availableBookings = bookings.filter(b => !feedbackBookingIds.has(b._id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBookingId || !rating || !comment.trim()) {
            alert('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            const feedbackData = {
                bookingId: selectedBookingId,
                rating,
                comment: comment.trim(),
                isAnonymous
            };

            const response = await DataService.submitFeedback(feedbackData);
            
            if (response.success) {
                alert('Feedback submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                setIsAnonymous(false);
                onFeedbackSubmit();
            } else {
                alert('Failed to submit feedback: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting feedback: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Leave Feedback</h2>
            <p className="text-gray-600 mb-6">Share your overall experience with DoRayd Travel & Tours</p>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select a completed booking *
                        </label>
                        <select 
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Choose a service experience...</option>
                            {availableBookings.map(booking => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.itemName} - {booking.bookingReference} ({new Date(booking.startDate).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Overall Rating *
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star 
                                        className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Feedback *
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tell us about your overall experience with our service..."
                            maxLength={1000}
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">{comment.length}/1000 characters</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="anonymous-feedback"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="anonymous-feedback" className="text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            ) : (
                <div className="text-center py-8">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed bookings available for feedback.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to share your experience!</p>
                </div>
            )}
        </div>
    );
};

const PublicFeedbackTab = ({ feedback }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">Customer Feedback</h2>
        <p className="text-gray-600 mb-6">See what our customers are saying about DoRayd Travel & Tours</p>
        
        <div className="space-y-6">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-3 rounded-full shadow-sm">
                            <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold">
                                    {item.isAnonymous ? 'Anonymous Customer' : `${item.user?.firstName} ${item.user?.lastName}`}
                                </p>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700 mb-3">{item.comment}</p>
                            <p className="text-sm text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString()}
                                <span className="mx-2">•</span>
                                {item.serviceType} service
                            </p>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No public feedback available yet.</p>
                </div>
            )}
        </div>
    </div>
);

const AccountSettingsTab = ({ user }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                        type="text"
                        value={user?.firstName || ''}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                        type="text"
                        value={user?.lastName || ''}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                        type="tel"
                        value={user?.phone || ''}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                    />
                </div>
            </div>
            <p className="text-sm text-gray-500">
                Contact support to update your account information.
            </p>
        </div>
    </div>
);

// Helper function
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-gray-100 text-gray-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default CustomerDashboard;