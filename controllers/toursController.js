import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';

export const getAllTours = async (req, res) => {
  try {
    const { page = 1, limit = 12, archived = 'false', ...filters } = req.query;
    
    const query = { archived: archived === 'true' };

    if (filters.featured) query.featured = filters.featured === 'true';
    if (filters.isAvailable) query.isAvailable = filters.isAvailable === 'true';
    if (filters.destination) query.destination = new RegExp(filters.destination, 'i');
    
    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    const tours = await Tour.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Tour.countDocuments(query);
    res.json({ 
        success: true, 
        data: tours, 
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tours', error: error.message });
  }
};

export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    res.json({ success: true, data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createTour = async (req, res) => {
  try {
    const tour = new Tour(req.body);
    await tour.save();
    
    const io = req.app.get('io');
    if (io) {
      // Notify customers about the new tour
      io.to('customer').emit('new-tour', {
          message: `New tour available: ${tour.title}`,
          link: `/tours/${tour._id}`
      });

      // Notify admin if an employee added the tour
      if (req.user.role === 'employee') {
          io.to('admin').emit('activity-log', {
              message: `Employee ${req.user.firstName} ${req.user.lastName} added a new tour: ${tour.title}`,
              link: '/owner/manage-tours'
          });
      }
    }

    res.status(201).json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    // Notify admin if an employee updated the tour
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        io.to('admin').emit('activity-log', {
            message: `Employee ${req.user.firstName} ${req.user.lastName} updated the tour: ${tour.title}`,
            link: '/owner/manage-tours'
        });
    }

    res.json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    
    // Notify admin if an employee archived the tour
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        io.to('admin').emit('activity-log', {
            message: `Employee ${req.user.firstName} ${req.user.lastName} archived the tour: ${tour.title}`,
            link: '/owner/manage-tours'
        });
    }
    
    res.json({ success: true, message: "Tour archived", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const unarchiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: false, isAvailable: true }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    res.json({ success: true, message: "Tour restored successfully", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};