import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import EmailService from '../utils/emailServices.js';
import crypto from 'crypto';

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
            return res.status(404).json({ success: false, message: 'No user with that email address exists.' });
        }
        
        console.log('✓ User found, generating reset token...');
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        console.log('✓ Token saved');

        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        console.log('📧 Attempting to send email to:', user.email);
        console.log('Reset URL:', resetURL);

        await EmailService.sendPasswordReset(user.email, resetURL);
        
        console.log('✅ Email sent successfully!');
        res.json({ success: true, message: 'Password reset token sent to your email!' });
    } catch (error) {
        console.error('❌ FORGOT PASSWORD ERROR:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ success: false, message: 'Error sending password reset email.' });
    }
};

// Reset Password - Step 2: Update password with token
export const resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ success: true, token, message: 'Password has been reset successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reset password.' });
    }
};

// Change Password for logged in user
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if (!user || !(await user.correctPassword(currentPassword, user.password))) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};