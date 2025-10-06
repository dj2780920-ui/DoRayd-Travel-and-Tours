import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import EmailService from '../utils/emailServices.js';

// Get all bookings for a specific service
export const getBookingAvailability = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const bookings = await Booking.find({
      itemId: serviceId,
      status: { $in: ['confirmed', 'pending'] }
    }).select('startDate endDate');

    const bookedDates = bookings.reduce((acc, booking) => {
      let currentDate = new Date(booking.startDate);
      const endDate = booking.endDate ? new Date(booking.endDate) : new Date(booking.startDate);

      while (currentDate <= endDate) {
        acc.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return acc;
    }, []);

    res.json({ success: true, data: { bookedDates: [...new Set(bookedDates)] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all bookings (for admin/employee)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
        .populate({
            path: 'itemId',
            select: 'brand model title' // Select only necessary fields
        })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get bookings for the currently authenticated user
export const getMyBookings = async (req, res) => {
    try {
        // UPDATED: Removed 'archived: false' from the query
        const bookings = await Booking.find({ user: req.user.id })
            .populate('itemId')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// CREATE a new booking
export const createBooking = async (req, res) => {
    try {
        const isUserLoggedIn = !!req.user;
        const userId = isUserLoggedIn ? req.user.id : null;

        const {
            itemType, itemId, itemName, startDate, endDate, dropoffCoordinates,
            paymentReference, amountPaid, firstName, lastName, email, phone,
            numberOfGuests, specialRequests, agreedToTerms, deliveryMethod,
            pickupLocation, dropoffLocation, totalPrice
        } = req.body;

        const finalFirstName = isUserLoggedIn ? req.user.firstName : firstName;
        const finalLastName = isUserLoggedIn ? req.user.lastName : lastName;
        const finalEmail = isUserLoggedIn ? req.user.email : email;
        const finalPhone = phone || (isUserLoggedIn ? req.user.phone : '');

        if (!itemType || !itemId || !startDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const item = itemType === 'car' ? await Car.findById(itemId) : await Tour.findById(itemId);
        if (!item || !item.isAvailable) {
            return res.status(400).json({ success: false, message: 'Selected item is not available' });
        }

        let coords = null;
        if (dropoffCoordinates) {
            try {
                coords = typeof dropoffCoordinates === 'string' ? JSON.parse(dropoffCoordinates) : dropoffCoordinates;
            } catch (error) {
                console.error('Invalid dropoff coordinates:', error);
            }
        }

        const newBooking = new Booking({
            user: userId,
            itemType,
            itemId,
            itemName,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : new Date(startDate),
            itemModel: itemType.charAt(0).toUpperCase() + itemType.slice(1),
            paymentProofUrl: req.file ? `/uploads/payment_proofs/${req.file.filename}` : null,
            dropoffCoordinates: coords,
            paymentReference,
            amountPaid: Number(amountPaid) || 0,
            firstName: finalFirstName,
            lastName: finalLastName,
            email: finalEmail,
            phone: finalPhone,
            numberOfGuests: Number(numberOfGuests) || 1,
            specialRequests,
            agreedToTerms: agreedToTerms === 'true' || agreedToTerms === true,
            deliveryMethod,
            pickupLocation,
            dropoffLocation,
            totalPrice: Number(totalPrice) || 0,
        });

        await newBooking.save();

        if(userId) {
            await User.findByIdAndUpdate(userId, { $push: { bookings: newBooking._id } });
        }

        if (req.app.get('io')) {
            req.app.get('io').emit('new-booking', newBooking);
        }
        
        try {
            await EmailService.sendBookingConfirmation(newBooking);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
        }

        res.status(201).json({ success: true, data: newBooking });

    } catch (error) {
        console.error('Error creating booking:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
        req.params.id, 
        { status, adminNotes, processedBy: req.user.id },
        { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Send automatic email for approved/rejected bookings
    try {
        if (status === 'confirmed' || status === 'rejected') {
            await EmailService.sendStatusUpdate(booking);
        }
    } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
    }

    if (req.app.get('io')) {
        req.app.get('io').emit('booking-updated', booking);
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// UPLOAD payment proof for a booking
export const uploadPaymentProof = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { paymentProofUrl: `/uploads/payment_proofs/${req.file.filename}` },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        if (req.app.get('io')) {
            req.app.get('io').emit('payment-proof-uploaded', booking);
        }
        
        res.json({ success: true, message: 'Payment proof uploaded successfully.', data: booking });

    } catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({ success: false, message: 'Failed to upload payment proof.' });
    }
};