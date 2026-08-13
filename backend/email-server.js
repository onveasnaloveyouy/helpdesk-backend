// Simple email server - runs independently on port 5001
// No database required - just handles email sending via Nodemailer + Gmail
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenAI } = require('@google/genai');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

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
app.post('/api/email/send-otp', async (req, res) => {
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

// POST /api/email/send-ticket
app.post('/api/email/send-ticket', async (req, res) => {
  const { ticket, config } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured.' });
  }

  try {
    const transporter = createTransporter(config);
    
    // Set the sender name to the user's name, but use the authenticated email
    const senderName = ticket.requester_name ? `${ticket.requester_name} (via IT System)` : (config.from_name || 'IT Ticket System');
    
    await transporter.sendMail({
      from: `"${senderName}" <${config.sender_email}>`,
      replyTo: ticket.requester_email || config.sender_email,
      to: config.sender_email,
      subject: `New Ticket: ${ticket.ticket_number} - ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background: #1a73e8; padding: 15px; color: white;">
            <h3 style="margin: 0;">New Ticket: ${ticket.ticket_number}</h3>
          </div>
          <div style="padding: 20px;">
            <p><strong>Requester:</strong> ${ticket.requester_name}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 15px;">
              <p style="margin: 0; white-space: pre-wrap;">${ticket.description}</p>
            </div>
            <p style="margin-top: 20px;">
              <a href="http://localhost:3001/tickets/${ticket.id}" style="background: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Ticket in System</a>
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
app.post('/api/email/send-confirmation', async (req, res) => {
  const { ticket, config } = req.body;

  if (!config?.sender_email || !config?.app_password) {
    return res.status(400).json({ error: 'Email not configured.' });
  }

  let emailHtml = '';

  if (!process.env.GEMINI_API_KEY) {
    // Fallback standard template if no API key is provided
    emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Support Ticket Confirmed</h2>
        <p>Hello ${ticket.requester_name},</p>
        <p>This is an automated message to let you know that your IT support ticket (<strong>${ticket.ticket_number}</strong>) has been received and reviewed by the IT Department.</p>
        <p><strong>Issue:</strong> ${ticket.category_name || ticket.subject || 'IT Support Request'}</p>
        <p>The status of your ticket has been updated to <strong>In Progress</strong>. A technician will be working on it shortly.</p>
        <br/>
        <p>Thank you,</p>
        <p>IT Department</p>
      </div>
    `;
  } else {
    // Generate AI email if key is provided
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Write a professional, polite, and empathetic IT support ticket confirmation email.
Ticket Details:
- Ticket Number: ${ticket.ticket_number}
- Requester Name: ${ticket.requester_name}
- Issue Category: ${ticket.category_name || ticket.subject || 'IT Support Request'}
- Issue Description: ${ticket.description || 'N/A'}

The email should:
1. Address the requester by name.
2. Acknowledge that their specific issue has been received and reviewed by the IT team.
3. State that the ticket is now confirmed and "In Progress".
4. Reassure them that a technician will be working on it shortly.
5. Be formatted as HTML (do not include standard markdown formatting blocks like \`\`\`html).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      emailHtml = response.text;
      emailHtml = emailHtml.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (err) {
      console.error('AI Generation error:', err);
      return res.status(500).json({ error: 'Failed to generate AI email: ' + err.message });
    }
  }

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
    console.error('Confirmation Email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/test
app.post('/api/email/test', async (req, res) => {
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

app.get('/api/email/health', (req, res) => res.json({ status: 'ok' }));

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`📧 Email server running on port ${PORT}`);
});
