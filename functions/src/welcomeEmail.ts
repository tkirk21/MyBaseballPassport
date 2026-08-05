export const welcomeEmailHtml = (name: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #000;">
  <div style="text-align: center;">
    <img src="https://firebasestorage.googleapis.com/v0/b/mybaseballpassport.firebasestorage.app/o/my_sports_passport_transparent_text.png?alt=media&token=d3f928de-7efe-4190-b483-a6a80027b019" alt="My Sports Passport" width="120" style="margin-bottom: 10px;" />
    <p style="color: #1a3a6b; font-weight: bold; letter-spacing: 1px; font-size: 12px; margin-top: 4px;">TRACK YOUR SPORTING JOURNEY</p>
  </div>

  <p style="text-align: center; font-weight: bold; margin-top: 32px; margin-bottom: 8px;">Hi ${name},</p>
  <p style="text-align: center; font-weight: bold; margin-bottom: 8px;">Thank you for joining My Baseball Passport.</p>
  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">A verification email has been sent to the email address you used to create your account. Before you can log in, you must verify your email address by clicking the link in that email. If you don't see the verification email in your Inbox, it's very common for it to be delivered to your Spam, Junk, or Promotions folder instead. Please check those folders before trying to log in.</p>

  <p style="text-align: center; font-weight: bold; margin-bottom: 8px;">We're excited to be part of your baseball journey and help you keep track of every ballpark, game, and memory along the way. Whether you're chasing all 30 MLB stadiums, exploring the minor leagues, or simply visiting your local ballpark, My Baseball Passport was built for fans who love the game.</p>
  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">To get started, make sure you complete your profile and begin checking into the ballparks you've visited.</p>

  <p style="text-align: center; font-weight: bold; margin-bottom: 8px;">One feature we don't want you to miss is our Referral Rewards Program. Simply tap the Profile tab, open Settings, and access your personal referral code and referral link.</p>
  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">Share your referral code with friends, family, and fellow baseball fans. Every successful referral earns you a free month of Premium, and there is no limit to how many free Premium months you can earn.</p>

  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">Thank you again for being part of the My Baseball Passport community. We're just getting started, and we look forward to helping you document your baseball adventures for years to come.</p>

  <p style="text-align: center; font-weight: bold; margin-bottom: 28px;">See you at the ballpark,</p>

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