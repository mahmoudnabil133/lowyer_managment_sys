export const verification_email_html = (
  code: string,
  name: string,
) => `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
          }
          .container {
              width: 100%;
              max-width: 600px;
              margin: 40px auto;
              padding: 20px;
              background-color: #ffffff;
              border: 1px solid #dddddd;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
              background-color: #28a745;
              color: #ffffff;
              padding: 15px;
              text-align: center;
              border-radius: 8px 8px 0 0;
          }
          .content {
              padding: 20px;
              text-align: center;
          }
          .footer {
              font-size: 12px;
              color: #666666;
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #dddddd;
          }
          .verification-code {
              font-size: 24px;
              font-weight: bold;
              color: #333333;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              padding: 12px 20px;
              font-size: 16px;
              color: #ffffff;
              background-color: #28a745;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
          }
          .button:hover {
              background-color: #218838;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Verify Your Email</h1>
          </div>
          <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for signing up! To complete your registration, please use the verification code below:</p>
              <div class="verification-code">${code}</div>
              <p>If you did not sign up, you can safely ignore this email.</p>
              <a href="#" class="button">Verify Now</a>
          </div>
          <div class="footer">
              <p>Need help? Contact our support team</p>
              <p>Thank you for choosing our service!</p>
          </div>
      </div>
  </body>
  </html>`;
