export const welcomeEmail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Zenith!</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin:0; padding:0; background-color:#030712; color:#F9FAFB; font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif; }
    .container { width:100%; max-width:600px; margin:0 auto; padding:40px 20px; }
    .card { background-color:#111827; border-radius:12px; padding:32px; border:1px solid #374151; }
    h1 { font-size:24px; font-weight:700; margin-top:0; color:#F9FAFB; }
    p { font-size:16px; line-height:1.5; color:#D1D5DB; margin:16px 0; }
    .button { display:inline-block; background-color:#F9FAFB; color:#111827; padding:14px 28px; font-size:16px; font-weight:600; text-decoration:none; border-radius:8px; margin:24px 0; }
    .footer { text-align:center; padding-top:24px; font-size:14px; color:#6B7280; }
    .footer a { color:#6B7280; text-decoration:underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Welcome to Zenith!</h1>
      <p>We're thrilled to have you on board. Zenith is designed to help you organize your work, plan your day, and achieve a calm, focused state of productivity.</p>
      <p>You have <strong>7 days of free Pro access</strong> — explore everything Zenith has to offer.</p>
      <a href="FRONTEND_URL/dashboard" class="button">Go to My Dashboard</a>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Zenith. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export const verificationCodeMail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenith - Verify Your Email</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin:0; padding:0; background-color:#030712; color:#F9FAFB; font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif; }
    .container { width:100%; max-width:600px; margin:0 auto; padding:40px 20px; }
    .card { background-color:#111827; border-radius:12px; padding:32px; border:1px solid #374151; }
    h1 { font-size:24px; font-weight:700; margin-top:0; color:#F9FAFB; }
    p { font-size:16px; line-height:1.5; color:#D1D5DB; margin:16px 0; }
    .code { display:inline-block; background-color:#030712; border-radius:8px; padding:12px 24px; font-size:32px; font-weight:700; letter-spacing:8px; color:#F9FAFB; margin:24px 0; border:1px solid #374151; }
    .footer { text-align:center; padding-top:24px; font-size:14px; color:#6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Verify Your Email Address</h1>
      <p>Thanks for signing up for Zenith. Use the code below to verify your email:</p>
      <div class="code">VERIFICATION_CODE</div>
      <p>This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer"><p>&copy; 2025 Zenith. All rights reserved.</p></div>
  </div>
</body>
</html>`;

export const resetPasswordMail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenith - Reset Your Password</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin:0; padding:0; background-color:#030712; color:#F9FAFB; font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif; }
    .container { width:100%; max-width:600px; margin:0 auto; padding:40px 20px; }
    .card { background-color:#111827; border-radius:12px; padding:32px; border:1px solid #374151; }
    h1 { font-size:24px; font-weight:700; margin-top:0; color:#F9FAFB; }
    p { font-size:16px; line-height:1.5; color:#D1D5DB; margin:16px 0; }
    .button { display:inline-block; background-color:#F9FAFB; color:#111827; padding:14px 28px; font-size:16px; font-weight:600; text-decoration:none; border-radius:8px; margin:24px 0; }
    .footer { text-align:center; padding-top:24px; font-size:14px; color:#6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Reset Your Password</h1>
      <p>We received a request to reset the password for your Zenith account.</p>
      <a href="RESET_LINK" class="button">Reset Password</a>
      <p>This link expires in <strong>30 minutes</strong>. If you didn't request this, ignore this email.</p>
      <p>— The Zenith Team</p>
    </div>
    <div class="footer"><p>&copy; 2025 Zenith. All rights reserved.</p></div>
  </div>
</body>
</html>`;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Weekly digest: which tasks moved to the backlog, plus a link to weekly planning.
 * Task titles are user text, so they are escaped before going into the HTML.
 */
export function buildWeeklyBacklogMail(
    data: { movedTitles: string[]; movedCount: number; completedLastWeek: number; backlogTotal: number },
    frontendUrl: string
): string {
    const items = data.movedTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join('');
    const more = data.movedCount > data.movedTitles.length
        ? `<p>and ${data.movedCount - data.movedTitles.length} more.</p>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your week, wrapped up</title>
  <style>
    body { margin:0; padding:0; background-color:#030712; color:#F9FAFB; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
    .container { width:100%; max-width:600px; margin:0 auto; padding:40px 20px; }
    .card { background-color:#111827; border-radius:12px; padding:32px; border:1px solid #374151; }
    h1 { font-size:24px; font-weight:700; margin-top:0; color:#F9FAFB; }
    p, li { font-size:16px; line-height:1.5; color:#D1D5DB; }
    ul { padding-left:20px; }
    .button { display:inline-block; background-color:#F9FAFB; color:#111827; padding:14px 28px; font-size:16px; font-weight:600; text-decoration:none; border-radius:8px; margin:24px 0; }
    .footer { text-align:center; padding-top:24px; font-size:14px; color:#6B7280; }
    .footer a { color:#6B7280; text-decoration:underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Your week, wrapped up</h1>
      <p>You finished <strong>${data.completedLastWeek}</strong> tasks last week.</p>
      <p>These were still open, so they moved to your backlog:</p>
      <ul>${items}</ul>
      ${more}
      <p>Your backlog now has <strong>${data.backlogTotal}</strong> tasks.</p>
      <a href="${frontendUrl}/dashboard?ritual=weekly-planning" class="button">Plan my week</a>
      <p>&mdash; The Zenith Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Zenith. All rights reserved.</p>
      <p><a href="${frontendUrl}/settings#preferences">Turn off weekly emails</a></p>
    </div>
  </div>
</body>
</html>`;
}
