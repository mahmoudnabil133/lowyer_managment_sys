export function completedHtml(bookingRef: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;background:#F7F5F0;padding:40px 20px;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#1B2A4A,#2C3E6B);border-radius:12px 12px 0 0;padding:30px 40px;text-align:center;">
      <h1 style="color:#C5A55A;font-size:22px;margin:0;">Appointment Complete</h1>
    </td></tr>
    <tr><td style="padding:32px 40px;text-align:center;">
      <p style="color:#2C2C2C;font-size:15px;margin:0 0 20px;">
        Your appointment (Ref: ${bookingRef}) has been marked as completed.
      </p>
      <p style="color:#6B7280;font-size:13px;">
        Thank you for choosing Lawyer Management System.
      </p>
    </td></tr>
  </table>
</body></html>`.trim();
}
