const welcomeEmail =`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Welcome to Zenith!</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #030712; /* Near black background */
      color: #F9FAFB;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .card {
      background-color: #111827; /* Dark gray card */
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #374151;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      color: #F9FAFB;
    }

    p {
      font-size: 16px;
      line-height: 1.5;
      color: #D1D5DB;
      margin: 16px 0;
    }
    
    .button {
      display: inline-block;
      background-color: #F9FAFB; /* Off-white accent */
      color: #111827; /* Dark text for contrast */
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      margin: 24px 0;
    }

    .footer {
      text-align: center;
      padding-top: 24px;
      font-size: 14px;
      color: #6B7280;
    }

    .footer a {
        color: #6B7280;
        text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Welcome to Zenith!</h1>
      <p>We're thrilled to have you on board. Zenith is designed to help you organize your work, plan your day, and achieve a calm, focused state of productivity.</p>
      <p>Ready to get started? Click the button below to jump right into your dashboard and plan your first day.</p>
      
      <a href="http://localhost:3000/Dashboard" class="button">Go to My Dashboard</a>
      
      <p>If you have any questions, feel free to check out our help guides or contact support.</p>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Zenith. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>

`

const verificationCodeMail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Zenith - Verify Your Email</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #030712; /* Near black background */
      color: #F9FAFB;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .card {
      background-color: #111827; /* Dark gray card */
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #374151;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      color: #F9FAFB;
    }

    p {
      font-size: 16px;
      line-height: 1.5;
      color: #D1D5DB;
      margin: 16px 0;
    }

    .code {
      display: inline-block;
      background-color: #030712;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #F9FAFB;
      margin: 24px 0;
      border: 1px solid #374151;
    }

    .footer {
      text-align: center;
      padding-top: 24px;
      font-size: 14px;
      color: #6B7280;
    }
    
    .footer a {
        color: #6B7280;
        text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Verify Your Email Address</h1>
      <p>Thanks for starting the new Zenith account creation process. To complete your sign up, please use the verification code below:</p>
      
      <div class="code"> VERIFICATION_CODE </div>
      
      <p>This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Zenith. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`

const resetPasswordMail =`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Zenith - Reset Your Password</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #030712; /* Near black background */
      color: #F9FAFB;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .card {
      background-color: #111827; /* Dark gray card */
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #374151;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      color: #F9FAFB;
    }

    p {
      font-size: 16px;
      line-height: 1.5;
      color: #D1D5DB;
      margin: 16px 0;
    }

    .button {
      display: inline-block;
      background-color: #F9FAFB; /* Off-white accent */
      color: #111827; /* Dark text for contrast */
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      margin: 24px 0;
    }

    .footer {
      text-align: center;
      padding-top: 24px;
      font-size: 14px;
      color: #6B7280;
    }

    .footer a {
        color: #6B7280;
        text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Reset Your Password</h1>
      <p>We received a request to reset the password for your Zenith account. You can reset your password by clicking the button below.</p>
      
      <a href="RESET_LINK" class="button">Reset Password</a>
      
      <p>This link will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Zenith. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>

`

export {welcomeEmail , verificationCodeMail , resetPasswordMail}