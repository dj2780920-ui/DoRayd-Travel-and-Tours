import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendPasswordReset(email, resetUrl) {
    const mailOptions = {
      from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to create a new password. This link is valid for 10 minutes.</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    };
    
    console.log('Sending email with credentials:');
    console.log('From:', process.env.EMAIL_USER);
    console.log('To:', email);
    console.log('Pass exists:', !!process.env.EMAIL_PASS);
    
    await this.transporter.sendMail(mailOptions);
  }

  async sendStatusUpdate(booking) {
    const mailOptions = {
      from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `Booking Status Update: ${booking.bookingReference} is ${booking.status.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Booking Update!</h2>
          <p>Dear ${booking.firstName},</p>
          <p>The status of your booking with reference number <strong>${booking.bookingReference}</strong> has been updated to: <strong>${booking.status.toUpperCase()}</strong>.</p>
          ${booking.adminNotes ? `<p><strong>Notes from our team:</strong> ${booking.adminNotes}</p>` : ''}
          <p>If you have any questions, please reply to this email.</p>
          <p>Thank you!</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }
  
  async sendPasswordReset(email, resetUrl) {
    const mailOptions = {
      from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to create a new password. This link is valid for 10 minutes.</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendContactReply(message, replyMessage) {
    const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: message.email,
        subject: `Re: ${message.subject}`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px;">
                <p>Hello ${message.name},</p>
                <p>Thank you for contacting us. Here is the response to your inquiry:</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 3px solid #007bff; margin: 15px 0;">
                    ${replyMessage}
                </div>
                <hr>
                <p style="font-size: 0.9em; color: #777;">
                    <strong>Original Message:</strong> "${message.message}"
                </p>
            </div>
        `
    };
    await this.transporter.sendMail(mailOptions);
  }
}

export default new EmailService();