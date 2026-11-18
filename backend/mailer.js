import nodemailer from 'nodemailer'
import 'dotenv/config'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_SECURE = process.env.SMTP_SECURE === 'false' ? false : SMTP_PORT === 465
const SMTP_USER = (process.env.SMTP_USER || '').trim()
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '')
const SMTP_FROM = process.env.SMTP_FROM || `RMJohn's Eatery <${SMTP_USER || 'no-reply@rmjohns.com'}>`

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (!SMTP_USER || !SMTP_PASS) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  return transporter
}

export function isSmtpConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS)
}

/**
 * Verify SMTP connection.
 */
export async function verifySmtpConnection() {
  const mailer = getTransporter()
  if (!mailer) {
    return { configured: false, message: 'SMTP_USER or SMTP_PASS is missing in .env.' }
  }
  try {
    await mailer.verify()
    return { configured: true, connected: true, message: 'SMTP connection verified successfully.' }
  } catch (err) {
    console.error('[SMTP] Verification error:', err.message)
    return { configured: true, connected: false, message: err.message }
  }
}

/**
 * Send 6-Digit Password Reset OTP Email
 */
export async function sendPasswordResetOtp({ toEmail, otpCode, username = 'there' }) {
  const mailer = getTransporter()

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #F4F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1B3B2B; }
        .wrapper { max-width: 520px; margin: 30px auto; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1.5px solid #E2E8D8; box-shadow: 0 10px 30px rgba(27, 59, 43, 0.08); }
        .header { background: linear-gradient(135deg, #1B3B2B 0%, #2A543D 100%); padding: 32px 24px; text-align: center; }
        .brand { font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #FFFFFF; margin: 0; letter-spacing: 0.5px; }
        .tagline { color: #D4E157; font-size: 13px; margin: 6px 0 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 16px; font-weight: 600; color: #1B3B2B; margin-bottom: 12px; }
        .desc { font-size: 14.5px; line-height: 1.6; color: #4A5D50; margin: 0 0 24px; }
        .otp-box { background-color: #F1F6EC; border: 2px dashed #93B588; border-radius: 14px; padding: 20px; text-align: center; margin: 0 0 24px; }
        .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #2C523A; margin-bottom: 8px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1B3B2B; margin: 0; }
        .expiry { font-size: 13px; color: #627A68; text-align: center; margin: 0 0 24px; }
        .security-note { border-top: 1px solid #ECEFE6; padding-top: 18px; font-size: 12.5px; color: #7A8E7F; line-height: 1.5; }
        .footer { background-color: #F9FAF7; padding: 20px; text-align: center; border-top: 1px solid #E8EDE0; font-size: 12px; color: #8A9C8F; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="brand">RMJohn's</h1>
          <p class="tagline">Kitchen &amp; Bar</p>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${username}!</div>
          <p class="desc">We received a request to reset your password. Use the verification code below to complete the password reset process.</p>
          <div class="otp-box">
            <div class="otp-label">Password Reset Code</div>
            <div class="otp-code">${otpCode}</div>
          </div>
          <p class="expiry">⏰ This code will expire in <strong>15 minutes</strong>.</p>
          <div class="security-note">
            <strong>Security Notice:</strong> If you did not request a password reset, you can safely ignore this email. No changes will be made to your account. Never share this code with anyone.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RMJohn's Eatery. All rights reserved.<br>
          Automated System Message &bull; Please do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `

  if (!mailer) {
    // Safe Console & Development Fallback
    console.log('\n======================================================')
    console.log('📧 [SMTP SIMULATED EMAIL - PASSWORD RESET OTP]')
    console.log(`To: ${toEmail}`)
    console.log(`Subject: RMJohn's — Password Reset Verification Code`)
    console.log(`OTP Code: >>> ${otpCode} <<< (Expires in 15 mins)`)
    console.log('Note: To send actual emails, add SMTP_USER & SMTP_PASS in .env')
    console.log('======================================================\n')
    return {
      success: true,
      simulated: true,
      message: 'SMTP credentials not configured. Verification code printed to server console.',
    }
  }

  try {
    const info = await mailer.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `RMJohn's — Password Reset Code: ${otpCode}`,
      html,
    })
    console.log(`[SMTP] Password reset code sent to ${toEmail}. Message ID: ${info.messageId}`)
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    }
  } catch (err) {
    console.error(`[SMTP] Failed to send email to ${toEmail}:`, err.message)
    throw new Error(`Email delivery failed: ${err.message}`)
  }
}
