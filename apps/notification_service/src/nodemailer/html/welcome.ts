export function welcomeEmailHtml(name: string, verifyUrl?: string): string {
  const url = verifyUrl || '#';
  const hasUrl = !!verifyUrl;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F0;font-family:'Inter',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F0;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;box-shadow:0 2px 12px rgba(27,42,74,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1B2A4A,#2C3E6B);border-radius:12px 12px 0 0;padding:30px 40px;text-align:center;">
          <h1 style="color:#C5A55A;font-size:24px;margin:0;font-family:'Playfair Display',serif;">Lawyer Management System</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1B2A4A;font-size:22px;margin:0 0 8px;">Welcome, ${name}!</h2>
          <p style="color:#2C2C2C;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Thank you for joining our platform. We're excited to have you on board.
            ${hasUrl ? 'Please verify your email address to get started.' : 'Please check your email for the verification code we sent you.'}
          </p>
          ${
            hasUrl
              ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#C5A55A;border-radius:8px;padding:12px 32px;">
              <a href="${url}" style="color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
                Verify Email Address
              </a>
            </td></tr>
          </table>`
              : ''
          }
          <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0;">
            If you didn't create an account, please ignore this email.<br>
            &copy; ${new Date().getFullYear()} Lawyer Management System. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
