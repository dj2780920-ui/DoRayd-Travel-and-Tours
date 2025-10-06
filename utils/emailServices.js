import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class EmailService {
  constructor() {
    this.isReady = false;
    this.transporter = null;
    // Store the initialization promise so we can await it later
    this.ready = this.initializeTransporter();
  }

  // Initialize the email transporter
  async initializeTransporter() {
    try {
      console.log('🔧 Initializing EmailService...');
      console.log('EMAIL_USER:', process.env.EMAIL_USER);
      console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

      // Check if credentials exist
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Missing EMAIL_USER or EMAIL_PASS in .env file');
        return;
      }

      // Create the transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL for Gmail
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        logger: true, // log SMTP conversation
        debug: true   // show detailed logs
      });

      // Verify the transporter connection
      console.log('🧪 Testing email connection...');
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      this.isReady = true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      this.isReady = false;
      this.transporter = null;
    }
  }

  // Send password reset email
  async sendPasswordReset(email, resetUrl) {
    await this.ready; // Ensure transporter is ready

    if (!this.isReady || !this.transporter) {
      throw new Error('Email service is not properly configured');
    }

    try {
      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h1 style="color: #007bff; margin: 0;">DoRayd Travel & Tours</h1>
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p style="color: #666; font-size: 16px;">
                You requested a password reset for your account. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              <p style="color: #888; font-size: 14px;">
                <strong>Important:</strong> This link is valid for only 10 minutes for security reasons.
              </p>
              <p style="color: #888; font-size: 14px;">
                If you did not request this password reset, please ignore this email.
              </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              © 2024 DoRayd Travel & Tours. All rights reserved.
            </div>
          </div>
        `
      };

      console.log(`📧 Sending password reset email to ${email}...`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.message);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send booking status update
  async sendStatusUpdate(booking) {
    await this.ready;

    if (!this.isReady || !this.transporter) {
      throw new Error('Email service is not properly configured');
    }

    try {
      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Status Update: ${booking.bookingReference} is ${booking.status.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h1 style="color: #007bff; margin: 0;">DoRayd Travel & Tours</h1>
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333;">Booking Update!</h2>
              <p>Dear ${booking.firstName},</p>
              <p>The status of your booking with reference number <strong>${booking.bookingReference}</strong> has been updated to:</p>
              <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <strong style="font-size: 18px; color: #007bff;">${booking.status.toUpperCase()}</strong>
              </div>
              ${booking.adminNotes ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                  <strong>Notes from our team:</strong><br>
                  ${booking.adminNotes}
                </div>
              ` : ''}
              <p>If you have any questions, please reply to this email or contact us directly.</p>
              <p>Thank you for choosing DoRayd Travel & Tours!</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              © 2024 DoRayd Travel & Tours. All rights reserved.
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Status update email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send status update email:', error.message);
      throw error;
    }
  }

  // Send a reply to contact message
  async sendContactReply(message, replyMessage) {
    await this.ready;

    if (!this.isReady || !this.transporter) {
      throw new Error('Email service is not properly configured');
    }

    try {
      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: message.email,
        subject: `Re: ${message.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h1 style="color: #007bff; margin: 0;">DoRayd Travel & Tours</h1>
            </div>
            <div style="padding: 30px 20px;">
              <p>Hello ${message.name},</p>
              <p>Thank you for contacting us. Here is the response to your inquiry:</p>
              <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
                ${replyMessage}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                <p style="font-size: 0.9em; color: #777; margin: 0;">
                  <strong>Your Original Message:</strong><br>
                  "${message.message}"
                </p>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              © 2024 DoRayd Travel & Tours. All rights reserved.
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Contact reply sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send contact reply:', error.message);
      throw error;
    }
  }

  // Check if service is ready
  isServiceReady() {
    return this.isReady;
  }

  // Reinitialize transporter manually if needed
  async reinitialize() {
    this.isReady = false;
    this.transporter = null;
    this.ready = this.initializeTransporter();
  }
}

// Export a single shared instance
export default new EmailService();
