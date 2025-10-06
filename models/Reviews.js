import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, refPath: 'itemModel', required: true },
  itemModel: { type: String, required: true, enum: ['Car', 'Tour'] },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  isApproved: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);