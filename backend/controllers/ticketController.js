const { pool } = require('../config/db');
const { generateTicketNumber, calculateDueDate, logActivity } = require('../utils/ticketHelpers');
const { sendEmail, newTicketEmail, ticketUpdateEmail, ticketResolvedEmail } = require('../utils/email');

// POST /api/tickets  (Employee creates a ticket)
async function createTicket(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      department_id, category_id, priority, subject, description,
      asset_number, location, phone, email
    } = req.body;

    const ticket_number = await generateTicketNumber();
    const due_at = await calculateDueDate(priority || 'Medium');

    const [result] = await conn.query(
      `INSERT INTO tickets
        (ticket_number, requester_id, department_id, category_id, priority, status,
         subject, description, location, due_at)
       VALUES (?,?,?,?,?, 'New', ?,?,?,?)`,
      [ticket_number, req.user.id, department_id, category_id || null, priority || 'Medium',
       subject || 'IT Support Request', description, location || null, due_at]
    );
    const ticketId = result.insertId;

    // Handle attachments uploaded with the ticket (multer populates req.files)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        await conn.query(
          `INSERT INTO ticket_attachments (ticket_id, uploaded_by, file_name, file_path, file_size, mime_type)
           VALUES (?,?,?,?,?,?)`,
          [ticketId, req.user.id, file.originalname, file.filename, file.size, file.mimetype]
        );
      }
    }

    await conn.query(
      `INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by) VALUES (?,NULL,'New',?)`,
      [ticketId, req.user.id]
    );

    await conn.commit();

    // Notify IT department (best-effort, doesn't block ticket creation on failure)
    const [[deptRow]] = await pool.query('SELECT name FROM departments WHERE id = ?', [department_id]);
    const [[catRow]] = category_id ? await pool.query('SELECT name FROM categories WHERE id = ?', [category_id]) : [[null]];
    const emailContent = newTicketEmail(
      { ticket_number, priority: priority || 'Medium', subject, description,
        department_name: deptRow?.name, category_name: catRow?.name },
      req.user.full_name
    );
    sendEmail({ to: process.env.IT_DEPARTMENT_EMAIL, ...emailContent, ticketId }).catch(() => {});

    await logActivity(req.user.id, 'TICKET_CREATED', `Ticket ${ticket_number} created`, req.ip);

    res.status(201).json({ message: 'Ticket created', ticket_number, id: ticketId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// GET /api/tickets  (list with filters, search, pagination; scoped by role)
async function listTickets(req, res, next) {
  try {
    const {
      page = 1, limit = 20, status, priority, category_id, department_id,
      technician_id, ticket_number, employee_name, date_from, date_to, sort = 'created_at', order = 'DESC'
    } = req.query;

    const where = [];
    const params = [];

    // Role-based scoping: employees only see their own tickets
    if (req.user.role === 'Employee') {
      where.push('t.requester_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'Technician') {
      // Technicians see tickets assigned to them OR unassigned tickets
      where.push('(t.assigned_technician_id = ? OR t.assigned_technician_id IS NULL)');
      params.push(req.user.id);
    }
    // Admin sees everything

    if (status) {
      if (status === 'Overdue') {
        where.push("t.due_at < datetime('now', 'localtime') AND t.status NOT IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete') OR name = 'Cancelled')");
      } else {
        where.push('t.status = ?');
        params.push(status);
      }
    }
    if (priority) { where.push('t.priority = ?'); params.push(priority); }
    if (category_id) { where.push('t.category_id = ?'); params.push(category_id); }
    if (department_id) { where.push('t.department_id = ?'); params.push(department_id); }
    if (technician_id) { where.push('t.assigned_technician_id = ?'); params.push(technician_id); }
    if (ticket_number) { where.push('t.ticket_number LIKE ?'); params.push(`%${ticket_number}%`); }
    if (employee_name) { where.push('req.full_name LIKE ?'); params.push(`%${employee_name}%`); }
    if (date_from) { 
      where.push('t.created_at >= ?'); 
      params.push(date_from.length === 10 ? `${date_from} 00:00:00` : date_from); 
    }
    if (date_to) { 
      where.push('t.created_at <= ?'); 
      params.push(date_to.length === 10 ? `${date_to} 23:59:59` : date_to); 
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const allowedSort = ['created_at', 'due_at', 'priority', 'status', 'ticket_number'];
    const sortCol = allowedSort.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [rows] = await pool.query(
      `SELECT t.*, req.full_name AS requester_name, tech.full_name AS technician_name,
              c.name AS category_name, d.name AS department_name,
              (t.due_at < NOW() AND t.status NOT IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete') OR name = 'Cancelled')) AS is_overdue
       FROM tickets t
       JOIN users req ON t.requester_id = req.id
       LEFT JOIN users tech ON t.assigned_technician_id = tech.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN departments d ON t.department_id = d.id
       ${whereSql}
       ORDER BY t.${sortCol} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t JOIN users req ON t.requester_id = req.id ${whereSql}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

// GET /api/tickets/:id
async function getTicket(req, res, next) {
  try {
    const { id } = req.params;
    const [[ticket]] = await pool.query(
      `SELECT t.*, req.full_name AS requester_name, req.email AS requester_email,
              tech.full_name AS technician_name, c.name AS category_name, d.name AS department_name
       FROM tickets t
       JOIN users req ON t.requester_id = req.id
       LEFT JOIN users tech ON t.assigned_technician_id = tech.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ?`, [id]
    );
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Access control: employees can only view their own ticket
    if (req.user.role === 'Employee' && ticket.requester_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isEmployee = req.user.role === 'Employee';
    const [comments] = await pool.query(
      `SELECT tc.*, u.full_name AS author_name, u.role_id
       FROM ticket_comments tc JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = ? ${isEmployee ? 'AND tc.is_internal = 0' : ''}
       ORDER BY tc.created_at ASC`, [id]
    );
    const [attachments] = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [id]);
    const [history] = await pool.query(
      `SELECT h.*, u.full_name AS changed_by_name FROM ticket_status_history h
       JOIN users u ON h.changed_by = u.id WHERE h.ticket_id = ? ORDER BY h.changed_at ASC`, [id]
    );

    res.json({ ticket, comments, attachments, history });
  } catch (err) { next(err); }
}

// PATCH /api/tickets/:id/status  (Technician/Admin)
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const [[statusRow]] = await pool.query('SELECT type FROM ticket_statuses WHERE name = ?', [status]);
    if (!statusRow) return res.status(400).json({ message: 'Invalid status' });

    const extra = {};
    if (statusRow.type === 'Complete') {
      extra.resolved_at = new Date();
      extra.closed_at = new Date();
    }

    const setCols = ['status = ?', ...Object.keys(extra).map(k => `${k} = ?`)];
    const params = [status, ...Object.values(extra), id];
    await pool.query(`UPDATE tickets SET ${setCols.join(', ')} WHERE id = ?`, params);

    await pool.query(
      `INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by) VALUES (?,?,?,?)`,
      [id, ticket.status, status, req.user.id]
    );
    await logActivity(req.user.id, 'STATUS_CHANGED', `Ticket ${ticket.ticket_number}: ${ticket.status} -> ${status}`, req.ip);

    // Notify requester
    const [[requester]] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [ticket.requester_id]);
    const [[tech]] = ticket.assigned_technician_id
      ? await pool.query('SELECT full_name FROM users WHERE id = ?', [ticket.assigned_technician_id])
      : [[null]];

    const updated = { ...ticket, status };
    if (statusRow.type === 'Complete') {
      const content = ticketResolvedEmail(updated);
      sendEmail({ to: requester.email, ...content, ticketId: id }).catch(() => {});
    } else {
      const content = ticketUpdateEmail(updated, tech?.full_name, null);
      sendEmail({ to: requester.email, ...content, ticketId: id }).catch(() => {});
    }

    res.json({ message: 'Status updated' });
  } catch (err) { next(err); }
}

// PATCH /api/tickets/:id/assign  (Admin/Technician)
async function assignTechnician(req, res, next) {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    await pool.query(
      `UPDATE tickets SET assigned_technician_id = ?, status = IF(status='New','Assigned',status) WHERE id = ?`,
      [technician_id, id]
    );
    await pool.query(
      `INSERT INTO ticket_assignments (ticket_id, technician_id, assigned_by) VALUES (?,?,?)`,
      [id, technician_id, req.user.id]
    );
    await logActivity(req.user.id, 'TICKET_ASSIGNED', `Ticket ${ticket.ticket_number} assigned`, req.ip);

    const [[tech]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [technician_id]);
    const [[requester]] = await pool.query('SELECT email FROM users WHERE id = ?', [ticket.requester_id]);
    const content = ticketUpdateEmail({ ...ticket, status: 'Assigned' }, tech.full_name, null);
    sendEmail({ to: requester.email, ...content, ticketId: id }).catch(() => {});

    res.json({ message: 'Technician assigned' });
  } catch (err) { next(err); }
}

// POST /api/tickets/:id/comments
async function addComment(req, res, next) {
  try {
    const { id } = req.params;
    const { comment, is_internal } = req.body;
    const internal = req.user.role === 'Employee' ? 0 : (is_internal ? 1 : 0);

    const [result] = await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal) VALUES (?,?,?,?)`,
      [id, req.user.id, comment, internal]
    );
    const commentId = result.insertId;

    if (req.files && req.files.length) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO ticket_attachments (ticket_id, comment_id, uploaded_by, file_name, file_path, file_size, mime_type)
           VALUES (?,?,?,?,?,?,?)`,
          [id, commentId, req.user.id, file.originalname, file.filename, file.size, file.mimetype]
        );
      }
    }

    await logActivity(req.user.id, 'COMMENT_ADDED', `Comment added to ticket ${id}`, req.ip);

    // Notify requester if a technician/admin replied (and it's not an internal-only note)
    if (req.user.role !== 'Employee' && !internal) {
      const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
      const [[requester]] = await pool.query('SELECT email FROM users WHERE id = ?', [ticket.requester_id]);
      const content = ticketUpdateEmail(ticket, req.user.full_name, comment);
      sendEmail({ to: requester.email, ...content, ticketId: id }).catch(() => {});
    }

    res.status(201).json({ message: 'Comment added', id: commentId });
  } catch (err) { next(err); }
}

// POST /api/tickets/:id/satisfaction  (Employee rates after ticket closed)
async function rateSatisfaction(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    await pool.query(
      'UPDATE tickets SET satisfaction_rating = ?, satisfaction_comment = ? WHERE id = ? AND requester_id = ?',
      [rating, comment || null, id, req.user.id]
    );
    res.json({ message: 'Thank you for your feedback' });
  } catch (err) { next(err); }
}

async function updateTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { priority, department_id, category_id, location, subject, description } = req.body;
    
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role !== 'Admin' && !(ticket.requester_id === req.user.id && ticket.status === 'New')) {
      return res.status(403).json({ message: 'Forbidden. Ticket can only be revised before IT confirmation.' });
    }

    await pool.query(
      'UPDATE tickets SET priority = ?, department_id = ?, category_id = ?, location = ?, subject = COALESCE(?, subject), description = COALESCE(?, description) WHERE id = ?',
      [priority, department_id || null, category_id || null, location || null, subject || null, description || null, id]
    );
    
    await pool.query(
      `INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by) VALUES (?, 'Updated', 'Updated', ?)`,
      [id, req.user.id]
    );

    res.json({ message: 'Ticket updated successfully' });
  } catch (err) { next(err); }
}

async function deleteTicket(req, res, next) {
  try {
    const { id } = req.params;
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role !== 'Admin' && !(ticket.requester_id === req.user.id && ticket.status === 'New')) {
      return res.status(403).json({ message: 'Forbidden. Ticket can only be deleted before IT confirmation.' });
    }

    await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (err) { next(err); }
}

module.exports = {
  createTicket, listTickets, getTicket, updateStatus, assignTechnician, addComment, rateSatisfaction, updateTicket, deleteTicket
};
