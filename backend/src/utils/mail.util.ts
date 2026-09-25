import nodemailer from 'nodemailer';

/**
 * Mail utility configured with SMTP credentials for password reset emails and system notifications.
 */
export class MailUtility {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  static async sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    
    console.log(`[MailUtility] Password reset email triggered for: ${email}`);
    
    // Attempt to send the email if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await this.transporter.sendMail({
          from: `"Wadaan ERP" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Reset your Master PIN - Wadaan ERP',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #059669;">Wadaan ERP Security</h2>
              <p>You recently requested to reset your Master PIN.</p>
              <p>Click the button below to set a new PIN. This link is valid for 15 minutes.</p>
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Reset Master PIN
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">If you did not request this reset, you can safely ignore this email.</p>
            </div>
          `,
        });
        console.log(`[MailUtility] Email sent successfully to ${email}`);
      } catch (error) {
        console.error('[MailUtility] Error sending email:', error);
        // We log the error but don't throw, as the controller design 
        // silently returns success to prevent email enumeration.
      }
    } else {
      console.warn('[MailUtility] SMTP credentials not fully configured. Email was not sent.');
      console.log(`[MailUtility] Reset link (for dev/testing): ${resetLink}`);
    }
  }
}
