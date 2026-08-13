const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { GoogleGenAI } = require('@google/genai');

// Create transporter from saved config
function createTransporter(config) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: config.sender_email,
      pass: config.app_password.replace(/\s/g, '') // remove spaces from app password
    }
  });
}

// POST /api/email/send-otp
router.post('/send-otp', async (req, res) => {
  const { to_email, to_name, otp_code, config } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured. Please set up Gmail in Settings.' });
  }

  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from: `"${config.from_name || 'IT Ticket System'}" <${config.sender_email}>`,
      to: to_email,
      subject: 'Your Verification Code - IT Ticket System',
      text: `Hello ${to_name},\n\nHere is your verification code for the IT Ticket System:\n\n${otp_code}\n\nThank you!`
    });
    res.json({ success: true, message: 'OTP email sent successfully!' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send-welcome
router.post('/send-welcome', async (req, res) => {
  const { to_email, to_name, password, config } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured.' });
  }

  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from: `"${config.from_name || 'IT Ticket System'}" <${config.sender_email}>`,
      to: to_email,
      subject: 'Welcome to the IT Ticket System',
      text: `Hello ${to_name},\n\nAn administrator has created an account for you in the IT Ticket System.\n\nYour login email: ${to_email}\nYour temporary password: ${password}\n\nPlease log in and change your password.\n\nThank you!`
    });
    res.json({ success: true, message: 'Welcome email sent successfully!' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send-ticket
router.post('/send-ticket', async (req, res) => {
  const { ticket, config } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured.' });
  }

  try {
    const transporter = createTransporter(config);
    
    // Set the sender name
    const senderName = config.from_name || 'IT Ticket System';
    
    await transporter.sendMail({
      from: `"${senderName}" <${config.sender_email}>`,
      to: ticket.requester_email,
      cc: config.sender_email, // Send a copy to the IT department
      subject: `Ticket Received: ${ticket.ticket_number} - ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background: #1a73e8; padding: 15px; color: white;">
            <h3 style="margin: 0;">Ticket Successfully Created: ${ticket.ticket_number}</h3>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${ticket.requester_name},</p>
            <p>Your ticket has been received and logged into our system. Our IT team will review it shortly.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 35%;"><strong>Requester:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.requester_name}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.requester_email || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Department:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.department_name || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Location:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.location || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.status || 'New'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.priority || 'Medium'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Category / Issue:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.category_name || '-'}</td></tr>
            </table>

            <p><strong>Description:</strong></p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #ced4da;">
              ${ticket.description || 'No description provided.'}
            </div>
            <p style="margin-top: 20px; font-size: 0.9em; color: #6c757d;">
              Please do not reply directly to this email unless requested. 
              <br>Thank you,<br>IT Support Team
            </p>
          </div>
        </div>
      `
    });
    res.json({ success: true, message: 'Notification sent!' });
  } catch (err) {
    console.error('Ticket Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send-confirmation
router.post('/send-confirmation', async (req, res) => {
  const { ticket, config, customMessage } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured.' });
  }

  // Build a clean, professional confirmation email with the IT staff's custom message
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #198754; padding: 15px; color: white;">
        <h3 style="margin: 0;"><span style="margin-right:8px;">✅</span>Ticket Confirmed: ${ticket.ticket_number}</h3>
      </div>
      <div style="padding: 20px;">
        <p>Hello <strong>${ticket.requester_name}</strong>,</p>
        <p>Your IT support ticket has been reviewed and confirmed by our IT Department. The status has been updated to <strong style="color:#198754;">In Progress</strong>.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 35%;"><strong>Ticket Number:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.ticket_number}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Issue:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.category_name || ticket.subject || 'IT Support Request'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ticket.priority || 'Medium'}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td style="padding: 8px 0; color: #198754; font-weight: bold;">In Progress</td></tr>
        </table>

        ${customMessage ? `
        <div style="margin-top: 16px;">
          <p><strong>Message from the IT Department:</strong></p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 4px; border-left: 4px solid #198754; white-space: pre-wrap;">
            ${customMessage}
          </div>
        </div>` : ''}

        <p style="margin-top: 20px; font-size: 0.9em; color: #6c757d;">
          Please do not reply directly to this email unless requested.<br>
          Thank you,<br><strong>IT Support Team</strong>
        </p>
      </div>
    </div>
  `;


  try {
    const transporter = createTransporter(config);
    const senderName = config.from_name || 'IT Department';
    
    const mailOptions = {
      from: `"${senderName}" <${config.sender_email}>`,
      to: ticket.requester_email || config.sender_email,
      subject: `[Ticket ${ticket.ticket_number}] Your request is now In Progress`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent: %s', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Confirmation Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/email/test
router.post('/test', async (req, res) => {
  const { config } = req.body;
  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Please fill in Gmail address and App Password first.' });
  }
  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    await transporter.sendMail({
      from: `"${config.from_name || 'IT Ticket System'}" <${config.sender_email}>`,
      to: config.sender_email,
      subject: '✅ Test Email - IT Ticket System Connected!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: #34a853; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">✅ Email Connected Successfully!</h2>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p>Your IT Ticket System email is now configured and working correctly.</p>
            <p>Users will receive verification codes at their email when they register.</p>
            <p style="color: #666; font-size: 13px;">Sent from: <strong>${config.sender_email}</strong></p>
          </div>
        </div>
      `
    });
    res.json({ success: true, message: `Test email sent to ${config.sender_email}` });
  } catch (err) {
    console.error('Test email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
