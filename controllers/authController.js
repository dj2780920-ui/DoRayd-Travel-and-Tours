import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import EmailService from '../utils/emailServices.js';
import crypto from 'crypto';
import { createNotification } from './notificationController.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({ 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        role: 'customer' 
    });
    await user.save();

    const io = req.app.get('io');
    if (io) {
      const notification = {
        message: `New customer registered: ${user.firstName} ${user.lastName}`,
        link: '/owner/customer-management'
      };
      io.to('admin').to('employee').emit('new-user', notification);
      // --- SAVE NOTIFICATION TO DB ---
      await createNotification(
        { roles: ['admin', 'employee'] },
        notification.message,
        notification.link
      );
    }

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated.' });
        }

        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        user.password = undefined;
        res.json({ success: true, token, user });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get current user profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Forgot Password - Step 1: Send reset token
export const forgotPassword = async (req, res) => {
    try {
        console.log('📧 Forgot password request for:', req.body.email);
        
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({ 
                success: false, 
                message: 'No user with that email address exists.' 
            });
        }
        
        console.log('✓ User found, generating reset token...');
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        console.log('✓ Token saved');

        // Use the frontend URL for the reset link
        const resetURL = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        console.log('📧 Attempting to send email to:', user.email);
        console.log('Reset URL:', resetURL);

        // Check if email service is ready
        if (!EmailService.isServiceReady()) {
            console.error('❌ Email service not ready, attempting to reinitialize...');
            await EmailService.reinitialize();
            
            if (!EmailService.isServiceReady()) {
                throw new Error('Email service is not available');
            }
        }

        await EmailService.sendPasswordReset(user.email, resetURL);
        
        console.log('✅ Email sent successfully!');
        res.json({ 
            success: true, 
            message: 'Password reset instructions have been sent to your email!' 
        });

    } catch (error) {
        console.error('❌ FORGOT PASSWORD ERROR:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        // Clean up the token if email failed
        if (req.body.email) {
            try {
                const user = await User.findOne({ email: req.body.email });
                if (user) {
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
                    await user.save({ validateBeforeSave: false });
                }
            } catch (cleanupError) {
                console.error('Error cleaning up token:', cleanupError);
            }
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Unable to send password reset email. Please try again later or contact support.' 
        });
    }
};

// Reset Password - Step 2: Update password with token
export const resetPassword = async (req, res) => {
    try {
        console.log('🔑 Password reset attempt with token:', req.params.token?.substring(0, 10) + '...');
        
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            console.log('❌ Invalid or expired token');
            return res.status(400).json({ 
                success: false, 
                message: 'Password reset token is invalid or has expired. Please request a new password reset.' 
            });
        }

        console.log('✓ Valid token found for user:', user.email);
        
        // Validate password strength
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long.' 
            });
        }

        // Update password and clear reset fields
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        console.log('✅ Password reset successfully for user:', user.email);

        // Generate new JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            success: true, 
            token, 
            message: 'Your password has been reset successfully. You are now logged in.' 
        });
        
    } catch (error) {
        console.error('❌ RESET PASSWORD ERROR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while resetting your password. Please try again.' 
        });
    }
};

// Change Password for logged in user
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Both current and new passwords are required.' 
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 6 characters long.' 
            });
        }
        
        const user = await User.findById(req.user.id).select('+password');

        if (!user || !(await user.correctPassword(currentPassword, user.password))) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect.' 
            });
        }

        user.password = newPassword;
        await user.save();

        console.log('✅ Password changed successfully for user:', user.email);
        res.json({ success: true, message: 'Password changed successfully.' });
        
    } catch (error) {
        console.error('❌ CHANGE PASSWORD ERROR:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};