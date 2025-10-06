import mongoose from 'mongoose';
import User from '../models/User.js'; // Must add .js extension for local files
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@dorayd.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists. To reset, please clear the "users" collection in your database first.');
      mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@dorayd.com',
      password: 'admin123', 
      role: 'admin',
      phone: '+639171234567',
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: admin123456`);

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();