const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');

// Shared query builder for report filters (daily/weekly/monthly/yearly + dims)
async function fetchReportData(query) {
  const { period, department_id, technician_id, category_id, priority, date_from, date_to } = query;
  const where = [];
  const params = [];

  if (department_id) { where.push('t.department_id = ?'); params.push(department_id); }
  if (technician_id) { where.push('t.assigned_technician_id = ?'); params.push(technician_id); }
  if (category_id) { where.push('t.category_id = ?'); params.push(category_id); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }

  if (date_from) { where.push('t.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('t.created_at <= ?'); params.push(date_to); }
  if (!date_from && !date_to && period) {
    const map = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
    const days = map[period] || 30;
    where.push('t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
    params.push(days);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT t.ticket_number, t.subject, t.priority, t.status, t.created_at, t.resolved_at, t.closed_at,
            req.full_name AS requester, tech.full_name AS technician,
            c.name AS category, d.name AS department
     FROM tickets t
     JOIN users req ON t.requester_id = req.id
     LEFT JOIN users tech ON t.assigned_technician_id = tech.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN departments d ON t.department_id = d.id
     ${whereSql}
     ORDER BY t.created_at DESC`, params
  );
  return rows;
}

// GET /api/reports/data  (JSON, for on-screen report preview)
async function getReportData(req, res, next) {
  try { res.json(await fetchReportData(req.query)); }
  catch (err) { next(err); }
}

// GET /api/reports/export/excel
async function exportExcel(req, res, next) {
  try {
    const rows = await fetchReportData(req.query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ticket Report');

    sheet.columns = [
      { header: 'Ticket #', key: 'ticket_number', width: 18 },
      { header: 'Subject', key: 'subject', width: 30 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Technician', key: 'technician', width: 20 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Department', key: 'department', width: 16 },
      { header: 'Created', key: 'created_at', width: 20 },
      { header: 'Resolved', key: 'resolved_at', width: 20 },
      { header: 'Closed', key: 'closed_at', width: 20 }
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach(r => sheet.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ticket-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

// GET /api/reports/export/pdf
async function exportPdf(req, res, next) {
  try {
    const rows = await fetchReportData(req.query);
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ticket-report.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('IT Help Desk - Ticket Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(9);

    const headers = ['Ticket #', 'Subject', 'Priority', 'Status', 'Requester', 'Technician', 'Created'];
    const colWidths = [70, 150, 55, 80, 90, 90, 90];

    function drawRow(values, y, bold = false) {
      let x = 30;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      values.forEach((v, i) => {
        doc.text(String(v ?? ''), x, y, { width: colWidths[i], ellipsis: true });
        x += colWidths[i];
      });
    }

    let y = doc.y;
    drawRow(headers, y, true);
    y += 18;

    rows.forEach(r => {
      if (y > 550) { doc.addPage(); y = 40; drawRow(headers, y, true); y += 18; }
      drawRow([r.ticket_number, r.subject, r.priority, r.status, r.requester, r.technician || '-', r.created_at], y);
      y += 16;
    });

    doc.end();
  } catch (err) { next(err); }
}

module.exports = { getReportData, exportExcel, exportPdf };
