/**
 * Mail utility stub for password reset emails and system notifications.
 * To be configured with SMTP / Resend / SendGrid credentials.
 */
export class MailUtility {
  static async sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    
    // In development, log the reset link to console for testing
    console.log(`[MailUtility] Password reset email triggered for: ${email}`);
    console.log(`[MailUtility] Reset link: ${resetLink}`);
    
    // Ready for integration with nodemailer / Resend / SendGrid
    return Promise.resolve();
  }
}
