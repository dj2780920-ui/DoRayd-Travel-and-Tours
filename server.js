import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

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

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // In production, restrict this to your frontend's URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files - IMPORTANT: This must come before other routes
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 Serving uploads from:', uploadsPath);

// Serve uploads directory with proper configuration
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Log all requests to uploads directory for debugging
app.use('/uploads', (req, res, next) => {
  console.log('📷 Upload request:', req.method, req.url);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('io', io);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// API Routes
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uploadsPath: uploadsPath,
  });
});

// Test endpoint to check if uploads directory is accessible
app.get('/api/test-uploads', (req, res) => {
  const fs = require('fs');
  const testPath = path.join(__dirname, 'uploads');
  
  try {
    const exists = fs.existsSync(testPath);
    const dirs = exists ? fs.readdirSync(testPath) : [];
    
    res.json({
      success: true,
      uploadsPath: testPath,
      exists: exists,
      directories: dirs,
      message: 'Uploads directory check'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsPath: testPath
    });
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected');
  });
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsPath}`);
  console.log(`🌐 Access uploads at: http://localhost:${PORT}/uploads/`);
  console.log('=== ENVIRONMENT CHECK ===');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET ✓' : 'NOT SET ✗');
  console.log('========================');
});

export default app;