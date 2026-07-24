export function reminder24hHtml(opts: {
  patientName: string;
  providerName: string;
  date: string;
  time: string;
  location: string;
  meetingLink?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F0;font-family:'Inter',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F0;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;box-shadow:0 2px 12px rgba(27,42,74,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1B2A4A,#2C3E6B);border-radius:12px 12px 0 0;padding:30px 40px;text-align:center;">
          <h1 style="color:#C5A55A;font-size:24px;margin:0;font-family:'Playfair Display',serif;">Reminder: Tomorrow</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1B2A4A;font-size:20px;margin:0 0 4px;">Hi ${opts.patientName},</h2>
          <p style="color:#2C2C2C;font-size:15px;margin:0 0 24px;">
            This is a friendly reminder that your appointment is <strong>tomorrow</strong>.
          </p>
          <table width="100%" cellpadding="10" cellspacing="0" style="background-color:#F7F5F0;border-radius:8px;margin-bottom:24px;">
            <tr><td style="font-size:14px;color:#6B7280;">Provider</td><td style="font-size:14px;color:#2C2C2C;font-weight:600;">${opts.providerName}</td></tr>
            <tr><td style="font-size:14px;color:#6B7280;">Date</td><td style="font-size:14px;color:#2C2C2C;font-weight:600;">${opts.date}</td></tr>
            <tr><td style="font-size:14px;color:#6B7280;">Time</td><td style="font-size:14px;color:#2C2C2C;font-weight:600;">${opts.time}</td></tr>
            <tr><td style="font-size:14px;color:#6B7280;">Location</td><td style="font-size:14px;color:#2C2C2C;font-weight:600;">${opts.location}</td></tr>
          </table>
          ${
            opts.meetingLink
              ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#C5A55A;border-radius:8px;padding:12px 32px;">
              <a href="${opts.meetingLink}" style="color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">Join Meeting</a>
            </td></tr>
          </table>`
              : ''
          }
          <p style="color:#6B7280;font-size:13px;margin:24px 0 0;">
            &copy; ${new Date().getFullYear()} Lawyer Management System
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
