import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

// Route Imports
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import carRoutes from './routes/cars.js';
import contentRoutes from './routes/content.js';
import messageRoutes from './routes/messages.js';
import tourRoutes from './routes/tours.js';
import uploadRoutes from './routes/upload.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import feedbackRoutes from './routes/feedback.js'; // Ensure feedback routes are imported
import notificationRoutes from './routes/notification.js';

// Middleware Imports
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Initial Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.set('io', io);

// --- CORRECT ROUTING ORDER ---

// 1. API Routes
// All API calls should be handled first.
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/feedback', feedbackRoutes); // Ensure feedback API route is registered
app.use('/api/notifications', notificationRoutes);

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 2. Static Asset Routes
// Serve uploaded files next.
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// 3. Frontend Application Route
// This should come after all API and static routes.
// It serves your React app's main HTML file for any non-API, non-file request.
const clientBuildPath = path.join(__dirname, 'client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
});

// --- END OF CORRECT ROUTING ORDER ---

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket');

  // Assign user to a room based on their role for targeted notifications
  socket.on('join', (role) => {
    socket.join(role);
    console.log(`User joined ${role} room`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected');
  });
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// MongoDB Connection and Server Start
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

export default app;