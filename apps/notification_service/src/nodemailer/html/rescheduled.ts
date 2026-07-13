export function rescheduledHtml(opts: {
  patientName: string;
  providerName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  bookingRef: string;
}): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;background:#F7F5F0;padding:40px 20px;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#1B2A4A,#2C3E6B);border-radius:12px 12px 0 0;padding:30px 40px;text-align:center;">
      <h1 style="color:#C5A55A;font-size:22px;margin:0;font-family:'Playfair Display',serif;">Appointment Rescheduled</h1>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="color:#1B2A4A;font-size:18px;margin:0 0 4px;">Hi ${opts.patientName},</h2>
      <p style="color:#2C2C2C;font-size:14px;margin:0 0 20px;">Your appointment has been rescheduled.</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="background:#F7F5F0;border-radius:8px;margin-bottom:20px;">
        <tr><td style="font-size:13px;color:#6B7280;">Provider</td><td style="font-size:13px;color:#2C2C2C;font-weight:600;">${opts.providerName}</td></tr>
        <tr><td style="font-size:13px;color:#6B7280;">Previous</td><td style="font-size:13px;color:#E65100;font-weight:600;">${opts.oldDate} at ${opts.oldTime}</td></tr>
        <tr><td style="font-size:13px;color:#6B7280;">New</td><td style="font-size:13px;color:#2E7D32;font-weight:600;">${opts.newDate} at ${opts.newTime}</td></tr>
        <tr><td style="font-size:13px;color:#6B7280;">Reference</td><td style="font-size:13px;color:#2C2C2C;font-weight:600;">${opts.bookingRef || ''}</td></tr>
      </table>
      <p style="color:#6B7280;font-size:12px;">&copy; ${new Date().getFullYear()} Lawyer Management System</p>
    </td></tr>
  </table>
</body></html>`.trim();
}
