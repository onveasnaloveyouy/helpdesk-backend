const nodemailer = require('nodemailer');
const { pool } = require('../config/db');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Sends an email and logs the attempt (success or failure) to email_logs.
async function sendEmail({ to, subject, html, ticketId = null }) {
  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to, subject, html
    });
    await pool.query(
      `INSERT INTO email_logs (ticket_id, recipient, subject, body, status) VALUES (?,?,?,?, 'Sent')`,
      [ticketId, to, subject, html]
    );
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    await pool.query(
      `INSERT INTO email_logs (ticket_id, recipient, subject, body, status, error_message) VALUES (?,?,?,?, 'Failed', ?)`,
      [ticketId, to, subject, html, err.message]
    );
    return false;
  }
}

function newTicketEmail(ticket, requesterName) {
  return {
    subject: `New IT Support Ticket - ${ticket.ticket_number}`,
    html: `
      <p>A new IT support request has been submitted.</p>
      <ul>
        <li><b>Requester:</b> ${requesterName}</li>
        <li><b>Department:</b> ${ticket.department_name || '-'}</li>
        <li><b>Priority:</b> ${ticket.priority}</li>
        <li><b>Category:</b> ${ticket.category_name || '-'}</li>
        <li><b>Subject:</b> ${ticket.subject}</li>
        <li><b>Description:</b> ${ticket.description}</li>
      </ul>
      <p>Please review the ticket immediately.</p>
    `
  };
}

function ticketUpdateEmail(ticket, technicianName, latestComment) {
  return {
    subject: `Ticket Update - ${ticket.ticket_number}`,
    html: `
      <p>Your IT support ticket has been updated.</p>
      <ul>
        <li><b>Ticket Number:</b> ${ticket.ticket_number}</li>
        <li><b>Status:</b> ${ticket.status}</li>
        <li><b>Assigned Technician:</b> ${technicianName || 'Unassigned'}</li>
        <li><b>Update Time:</b> ${new Date().toLocaleString()}</li>
        <li><b>Latest Comment:</b> ${latestComment || '-'}</li>
      </ul>
    `
  };
}

function ticketResolvedEmail(ticket) {
  return {
    subject: `Please Confirm Resolution - ${ticket.ticket_number}`,
    html: `
      <p>Your ticket <b>${ticket.ticket_number}</b> has been marked as <b>Resolved</b>.</p>
      <p>Please log in to the Help Desk portal to confirm and close the ticket, or reply if the issue persists.</p>
    `
  };
}

module.exports = { sendEmail, newTicketEmail, ticketUpdateEmail, ticketResolvedEmail };
