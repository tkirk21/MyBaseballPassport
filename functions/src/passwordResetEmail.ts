//baseball/functions/src/passwordResetEmail.ts
export const passwordResetEmailHtml = (name: string, resetLink: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #000;">
  <div style="text-align: center;">
    <img src="https://firebasestorage.googleapis.com/v0/b/mybaseballpassport.firebasestorage.app/o/my_sports_passport_transparent_text.png?alt=media&token=d3f928de-7efe-4190-b483-a6a80027b019" alt="My Sports Passport" width="120" style="margin-bottom: 10px;" />
    <p style="color: #1a3a6b; font-weight: bold; letter-spacing: 1px; font-size: 12px; margin-top: 4px;">TRACK YOUR SPORTING JOURNEY</p>
  </div>

  <p style="text-align: center; font-weight: bold; margin-top: 32px; margin-bottom: 8px;">Hi ${name},</p>
  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">We received a request to reset the password for your My Baseball Passport account.</p>

  <div style="text-align: center; margin-bottom: 28px;">
    <a href="${resetLink}" style="background-color: #1a3a6b; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 32px; border-radius: 6px; display: inline-block;">Reset Password</a>
  </div>

  <p style="text-align: center; font-size: 13px; color: #555; margin-bottom: 28px;">If the button above doesn't work, copy and paste this link into your browser:<br/>
    <a href="${resetLink}" style="color: #1a73e8; word-break: break-all;">${resetLink}</a>
  </p>

  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

  <p style="text-align: center; margin-bottom: 20px;">
    <strong style="color: #1a3a6b;">My Sports Passport</strong><br/>
    <strong style="color: #1a3a6b;">Track venues. Share experiences. Build your passport.</strong>
  </p>

  <p style="font-size: 14px;">
    --<br/>
    Troy Kirk<br/>
    Founder | My Sports Passport<br/>
    <a href="mailto:support@mysportspassport.app" style="color: #1a73e8;">support@mysportspassport.app</a>
  </p>
</div>
`;