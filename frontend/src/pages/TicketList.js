import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['Low','Medium','High','Critical'];

export default function TicketList() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialStatus = searchParams.get('status') || '';

  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [ticketToDelete, setTicketToDelete] = useState(null);
  
  function deleteTicket(id, e) {
    e.stopPropagation(); // prevent row click
    setTicketToDelete(id);
  }

  async function confirmDeleteTicket() {
    if (!ticketToDelete) return;
    try {
      await api.delete(`/tickets/${ticketToDelete}`);
      setTicketToDelete(null);
      load(meta.page);
    } catch (err) {
      console.error('Failed to delete ticket', err);
      alert('Error deleting ticket');
    }
  }

  async function handleCompleteTicket(id, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to mark this ticket as Complete?")) return;
    try {
      await api.patch(`/tickets/${id}/status`, { status: 'Complete' });
      load(meta.page);
    } catch (err) {
      console.error('Failed to complete ticket', err);
      alert('Error completing ticket');
    }
  }
  const [filters, setFilters] = useState({ status: initialStatus, priority: '', ticket_number: '', employee_name: '' });
  const [printMode, setPrintMode] = useState(null);
  const { user } = useAuth();

  const [ticketToConfirm, setTicketToConfirm] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Technician') {
      api.get('/users/technicians').then((r) => setTechnicians(r.data)).catch(console.error);
    }
  }, [user?.role]);

  async function handleConfirmTicket() {
    if (!ticketToConfirm) return;
    setIsConfirming(true);
    try {
      await api.patch(`/tickets/${ticketToConfirm.id}/status`, { status: 'In Progress' });
      if (assignedTechnicianId) {
        await api.patch(`/tickets/${ticketToConfirm.id}/assign`, { technician_id: assignedTechnicianId });
      }
      const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
      if (config.sender_email && config.app_password) {
        await api.post('/email/send-confirmation', { ticket: ticketToConfirm, config, customMessage: confirmMessage });
      }
      if (confirmMessage.trim()) {
        const fd = new FormData();
        fd.append('comment', confirmMessage);
        fd.append('is_internal', false);
        await api.post(`/tickets/${ticketToConfirm.id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setTicketToConfirm(null);
      setConfirmMessage('');
      load(meta.page);
    } catch (err) {
      console.error('Failed to confirm ticket', err);
      alert('Error confirming ticket');
    } finally {
      setIsConfirming(false);
    }
  }

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 200);
  };

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const savedDepts = localStorage.getItem('app_departments');
    if (savedDepts) {
      setDepartments(JSON.parse(savedDepts));
    } else {
      setDepartments([
        { id: 1, name: 'IT Support' },
        { id: 2, name: 'Human Resources' },
        { id: 3, name: 'Finance' }
      ]);
    }
    
    api.get('/statuses').then(r => setStatuses(r.data)).catch(console.error);
  }, []);

  async function load(page = 1, overrideFilters = null) {
    try {
      const activeFilters = overrideFilters !== null ? overrideFilters : filters;
      const params = { page, limit: 15, ...activeFilters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await api.get('/tickets', { params });
      setTickets(data.data);
      setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch (error) {
      console.error(error);
      setTickets([]);
    }
  }

  // Load initially when component mounts and whenever filters change
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [filters]);

  const handleSearch = () => {
    load(1);
  };

  const handleClear = () => {
    setFilters({});
    load(1, {});
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0">{user?.role !== 'Admin' ? 'My Tickets' : 'All Tickets'}</h4>


        </div>
        <div className="d-flex gap-2">
          <div className="dropdown">
            <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i className="bi bi-printer me-1"></i>Print
            </button>
            <ul className="dropdown-menu">
              <li><button className="dropdown-item" onClick={() => handlePrint('summary')}>Print Summary</button></li>
              <li><button className="dropdown-item" onClick={() => handlePrint('detail')}>Print Detail</button></li>
            </ul>
          </div>
          {(user?.role === 'User' || user?.role === 'Admin') && (
            <Link to="/tickets/new" className="btn btn-primary btn-sm"><i className="bi bi-plus-circle me-1"></i>New Ticket</Link>
          )}
        </div>
      </div>

      <div className="card shadow-sm mb-3 d-print-none">
        <div className="card-body">
          <div className="row g-2">
            <div className="col">
              <input className="form-control form-control-sm" placeholder="Ticket # (No)"
                value={filters.ticket_number || ''} onChange={(e) => setFilters({ ...filters, ticket_number: e.target.value })} />
            </div>
            <div className="col d-flex gap-1">
              <input type="date" className="form-control form-control-sm" title="From Date"
                value={filters.date_from || ''} onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 1 })} />
              <input type="date" className="form-control form-control-sm" title="To Date"
                value={filters.date_to || ''} onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 1 })} />
            </div>
            {user.role === 'Admin' && (
              <div className="col">
                <input className="form-control form-control-sm" placeholder="Employee name"
                  value={filters.employee_name || ''} onChange={(e) => setFilters({ ...filters, employee_name: e.target.value })} />
              </div>
            )}
            <div className="col">
              <select className="form-select form-select-sm" value={filters.department_id || ''}
                onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}>
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col">
                <select className="form-select form-select-sm" value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Status</option>
                  {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="Overdue">Overdue</option>
                </select>
            </div>
            <div className="col">
              <select className="form-select form-select-sm" value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                <option value="">All Priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-auto d-flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                <i className="bi bi-search me-1"></i>Search
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className={`table-responsive ${printMode === 'detail' ? 'd-print-none' : ''}`}>
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Ticket #</th><th>Subject</th><th>Priority</th><th>Status</th>
                {user.role === 'Admin' && <th>Requester</th>}
                <th>Resolved by</th><th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={`${t.is_overdue ? 'row-overdue' : ''}`}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view ticket details"
                >
                  <td><span className="text-dark fw-bold">{t.ticket_number}</span></td>
                  <td>{t.subject}</td>
                  <td><span className={`badge badge-priority-${t.priority}`}>{t.priority}</span></td>
                  <td>
                    <span 
                      className="badge text-white" 
                      style={{ backgroundColor: statuses.find(s => s.name === t.status)?.color_code || '#6c757d' }}
                    >
                      {t.status}
                    </span>
                  </td>
                  {user.role === 'Admin' && <td>{t.requester_name}</td>}
                  <td>{t.technician_name || '-'}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="text-end" onClick={(e) => e.stopPropagation()}>
                    {t.status === 'New' && (user.role === 'Admin' || user.role === 'Technician') && (
                      <button
                        className="btn btn-sm btn-success me-1"
                        onClick={() => { setTicketToConfirm(t); setConfirmMessage(''); setAssignedTechnicianId(t.assigned_technician_id || ''); }}
                        title="Confirm Ticket & Reply"
                      >
                        <i className="bi bi-check-circle me-1"></i>Confirm
                      </button>
                    )}
                    {t.status === 'In Progress' && (user.role === 'Admin' || (user.role === 'User' && t.requester_id === user.id)) && (
                      <button
                        className="btn btn-sm btn-primary me-1"
                        onClick={(e) => handleCompleteTicket(t.id, e)}
                        title="Mark as Complete"
                      >
                        <i className="bi bi-check2-all me-1"></i>Complete
                      </button>
                    )}
                    {(user.role === 'Admin' || (user.role === 'User' && t.requester_id === user.id && t.status === 'New')) && (
                      <>
                        <button 
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => navigate(`/tickets/${t.id}`)}
                          title="Edit / Revise Ticket"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => deleteTicket(t.id, e)}
                          title="Delete Ticket"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={user.role === 'Admin' ? 8 : 7} className="text-center text-muted py-4">No tickets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center d-print-none">
          <span className="small text-muted">Total: {meta.total}</span>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item ${p === meta.page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => load(p)}>{p}</button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {printMode === 'detail' && (
        <div className="d-none d-print-block">
          <div className="text-center mb-4">
            <img src="/logo1.jpg" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
            <h4 className="mt-2 fw-bold text-dark">Tickets Detail Report</h4>
            <p className="text-muted">Total: {meta.total} tickets (Page {meta.page})</p>
          </div>
          {tickets.map(t => (
            <div key={t.id} className="mb-4 pb-4 border-bottom" style={{ pageBreakInside: 'avoid' }}>
              <h5 className="fw-bold">{t.ticket_number} — {t.subject}</h5>
              <div className="row small mb-2 text-muted">
                <div className="col-3"><strong>Status:</strong> {t.status}</div>
                <div className="col-3"><strong>Priority:</strong> {t.priority}</div>
                <div className="col-3"><strong>Created:</strong> {new Date(t.created_at).toLocaleString()}</div>
                <div className="col-3"><strong>Requester:</strong> {t.requester_name}</div>
              </div>
              <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{t.description || 'No description provided.'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={!!ticketToDelete} onHide={() => setTicketToDelete(null)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger fw-bold fs-5">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Delete Ticket
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-4 text-secondary">
          Are you sure you want to permanently delete this ticket? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setTicketToDelete(null)} className="fw-semibold px-4">
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteTicket} className="fw-semibold px-4 shadow-sm">
            Yes, Delete it
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Ticket Modal */}
      <Modal show={!!ticketToConfirm} onHide={() => setTicketToConfirm(null)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-success fw-bold fs-5">
            <i className="bi bi-check-circle-fill me-2"></i>Confirm Ticket #{ticketToConfirm?.ticket_number} &amp; Reply to User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 pb-2">
          <div className="alert alert-info py-2 small mb-3">
            <i className="bi bi-info-circle me-1"></i>
            This will set the ticket status to <strong>In Progress</strong> and send an email notification to <strong>{ticketToConfirm?.requester_email || ticketToConfirm?.requester_name}</strong>.
          </div>
          {(user?.role === 'Admin' || user?.role === 'Technician') && (
            <div className="mb-3">
              <label className="form-label fw-semibold">Assign Resolved by</label>
              <select
                className="form-select form-select-sm"
                value={assignedTechnicianId}
                onChange={(e) => setAssignedTechnicianId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} {tech.open_ticket_count ? `(${tech.open_ticket_count} open)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="form-label fw-semibold">Description / Message to User <span className="text-danger">*</span></label>
          <textarea
            className="form-control"
            rows={6}
            placeholder="e.g. We have received your request and our technician is currently looking into the issue. We will update you as soon as possible..."
            value={confirmMessage}
            onChange={(e) => setConfirmMessage(e.target.value)}
          />
          <div className="form-text mt-1">This message will be visible in the ticket comments and included in the email sent to the user.</div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-1">
          <Button variant="light" onClick={() => setTicketToConfirm(null)} className="fw-semibold px-4">
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmTicket}
            disabled={!confirmMessage.trim() || isConfirming}
            className="fw-semibold px-4 shadow-sm"
          >
            {isConfirming
              ? <><span className="spinner-border spinner-border-sm me-1"></span>Sending...</>
              : <><i className="bi bi-send me-1"></i>Confirm &amp; Send Email</>
            }
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}
