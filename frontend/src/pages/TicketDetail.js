import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const getStatusColor = (status, statusesArray = []) => {
  const s = statusesArray.find(x => x.name === status);
  return s ? s.color_code : '#6c757d';
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Low': return '#6c757d';
    case 'Medium': return '#d39e00';
    case 'High': return '#fd7e14';
    case 'Critical': return '#dc3545';
    default: return '#212529';
  }
};

const PALETTE = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#198754', '#20c997', '#0dcaf0'];
export const getDynamicColor = (str) => {
  if (!str) return '#212529';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [comments, setComments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState([]);
  const [rating, setRating] = useState(5);
  const [error, setError] = useState('');

  const [draftStatus, setDraftStatus] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [draftPriority, setDraftPriority] = useState('');
  const [draftDepartment, setDraftDepartment] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftLocation, setDraftLocation] = useState('');

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);


  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [showQuickUserModal, setShowQuickUserModal] = useState(false);
  const [quickUserName, setQuickUserName] = useState('');
  const [quickUserEmail, setQuickUserEmail] = useState('');
  const [quickUserRole, setQuickUserRole] = useState('Technician');
  const [quickUserPassword, setQuickUserPassword] = useState('123456');
  const [creatingUser, setCreatingUser] = useState(false);

  async function handleQuickCreateUser(e) {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const empId = 'EMP' + Math.floor(1000 + Math.random() * 9000);
      const res = await api.post('/users', {
        employee_id: empId,
        full_name: quickUserName,
        email: quickUserEmail || `${empId.toLowerCase()}@company.com`,
        password: quickUserPassword || '123456',
        role: quickUserRole
      });
      const newId = res.data.id;
      const techRes = await api.get('/users/technicians');
      setTechnicians(techRes.data);
      if (newId) setDraftAssignee(newId);
      setShowQuickUserModal(false);
      setQuickUserName('');
      setQuickUserEmail('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating user');
    } finally {
      setCreatingUser(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setData(data);
      setTicket(data.ticket);
      setComments(data.comments);
      setDraftStatus(data.ticket.status);
      setDraftAssignee(data.ticket.assigned_technician_id || '');
      setDraftPriority(data.ticket.priority || 'Medium');
      setDraftDepartment(data.ticket.department_id || '');
      setDraftCategory(data.ticket.category_id || '');
      setDraftLocation(data.ticket.location || '');
    } catch (err) {
      setFetchError('Ticket not found or has been deleted.');
    }
  }, [id]);

  useEffect(() => { 
    load(); 
    api.get('/statuses').then(r => setStatuses(r.data)).catch(console.error);
  }, [load]);

  useEffect(() => {
    if (user.role === 'Admin' || user.role === 'Technician') {
      api.get('/users/technicians').then((r) => setTechnicians(r.data)).catch(console.error);
    }
    
    api.get('/departments').then((r) => setDepartments(r.data)).catch(console.error);
    api.get('/categories').then((r) => setCategories(r.data.filter(c => c.is_active))).catch(console.error);
    
    const savedLocs = localStorage.getItem('app_locations');
    if (savedLocs) {
      setLocations(JSON.parse(savedLocs));
    } else {
      setLocations(['Head Office', 'Branch Office', 'Remote', 'Other']);
    }
  }, [user.role]);

  if (fetchError) {
    return (
      <div className="container py-5 text-center">
        <h4 className="text-danger"><i className="bi bi-exclamation-triangle"></i> {fetchError}</h4>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/tickets')}>Back to Tickets</button>
      </div>
    );
  }
  if (!data || !ticket) return <p>Loading...</p>;
  const { attachments, history } = data;

  async function submitComment(e) {
    e.preventDefault();
    setError('');
    try {
      const fd = new FormData();
      fd.append('comment', comment);
      fd.append('is_internal', isInternal);
      files.forEach((f) => fd.append('attachments', f));
      await api.post(`/tickets/${id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setComment(''); setFiles([]); setIsInternal(false);
      load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to add comment'); }
  }

  async function saveTicketChanges() {
    try {
      if (draftStatus !== ticket.status) {
        await api.patch(`/tickets/${id}/status`, { status: draftStatus });
      }
      if (draftAssignee !== (ticket.assigned_technician_id || '')) {
        await api.patch(`/tickets/${id}/assign`, { technician_id: draftAssignee });
      }
      if (draftPriority != ticket.priority || draftDepartment != (ticket.department_id || '') || draftCategory != (ticket.category_id || '') || draftLocation != (ticket.location || '')) {
        await api.put(`/tickets/${id}`, {
          priority: draftPriority,
          department_id: draftDepartment,
          category_id: draftCategory,
          location: draftLocation
        });
      }
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmTicket() {
    setConfirming(true);
    setShowConfirmModal(false);
    try {
      // 1. Update status to In Progress
      await api.patch(`/tickets/${id}/status`, { status: 'In Progress' });
      
      // 2. Send confirmation email with custom message
      const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
      if (config.sender_email && config.app_password) {
        await api.post('/email/send-confirmation', { ticket, config, customMessage: confirmMessage });
      }

      // 3. Also post it as a visible comment on the ticket
      if (confirmMessage.trim()) {
        const fd = new FormData();
        fd.append('comment', confirmMessage);
        fd.append('is_internal', false);
        await api.post(`/tickets/${id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      setConfirmMessage('');
      load();
    } catch (err) {
      setError(err.message || 'Failed to confirm ticket');
    } finally {
      setConfirming(false);
    }
  }

  async function submitRating() {
    await api.post(`/tickets/${id}/satisfaction`, { rating });
    load();
  }

  function deleteTicket() {
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteTicket() {
    try {
      await api.delete(`/tickets/${id}`);
      navigate('/tickets');
    } catch (err) {
      console.error('Failed to delete ticket', err);
      alert('Error deleting ticket');
    }
  }

  return (
    <div className="row g-3">
      {/* Print-only Logo Header */}
      <div className="d-none d-print-block text-center mb-4 w-100">
        <img src="/logo1.jpg" alt="Logo" style={{ height: '80px', objectFit: 'contain' }} />
        <h4 className="mt-2 fw-bold text-dark">Request Tickets System</h4>
      </div>

      <div className="col-lg-8">
        <div className="card shadow-sm mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <button className="btn btn-link p-0 text-decoration-none mb-2 d-print-none fw-semibold" onClick={() => navigate('/tickets')}>
                <i className="bi bi-arrow-left me-1"></i>Back
              </button>
              <h5 className="mb-0">{ticket.ticket_number}</h5>
              <small className="text-muted">Opened {new Date(ticket.created_at).toLocaleString()}</small>
            </div>
            <div className="d-flex gap-2">
              {data?.prev_id && (
                <button className="btn btn-sm btn-outline-primary d-print-none" onClick={() => navigate(`/tickets/${data.prev_id}`)}>
                  <i className="bi bi-chevron-left"></i> Prev
                </button>
              )}
              {data?.next_id && (
                <button className="btn btn-sm btn-outline-primary d-print-none" onClick={() => navigate(`/tickets/${data.next_id}`)}>
                  Next <i className="bi bi-chevron-right"></i>
                </button>
              )}
              {(user?.role === 'Admin' || (ticket.requester_id === user?.id && ticket.status === 'New')) && (
                <button className="btn btn-sm btn-outline-danger d-print-none" onClick={deleteTicket} title="Delete Ticket">
                  <i className="bi bi-trash me-1"></i>Delete
                </button>
              )}
              <button className="btn btn-sm btn-outline-secondary d-print-none" onClick={() => window.print()}>
                <i className="bi bi-printer me-1"></i>Print
              </button>
            </div>
          </div>
          <div className="card-body">
            <dl className="row small mb-3">
              <dt className="col-sm-4">Requester by</dt>
              <dd className="col-sm-8">{ticket.requester_name}</dd>
              {ticket.requester_sex && (
                <>
                  <dt className="col-sm-4">Sex</dt>
                  <dd className="col-sm-8"><i className="bi bi-person me-1 text-muted"></i>{ticket.requester_sex}</dd>
                </>
              )}
              {ticket.requester_email && (
                <>
                  <dt className="col-sm-4">Email</dt>
                  <dd className="col-sm-8"><i className="bi bi-envelope me-1 text-muted"></i>{ticket.requester_email}</dd>
                </>
              )}
              {ticket.requester_phone && (
                <>
                  <dt className="col-sm-4">Phone</dt>
                  <dd className="col-sm-8"><i className="bi bi-telephone me-1 text-muted"></i>{ticket.requester_phone}</dd>
                </>
              )}
              <dt className="col-sm-4">Department</dt><dd className="col-sm-8" style={{ color: getDynamicColor(departments.find(d => d.id == ticket.department_id)?.name || ticket.department_name), fontWeight: '500' }}>{departments.find(d => d.id == ticket.department_id)?.name || ticket.department_name}</dd>
              <dt className="col-sm-4">Location</dt><dd className="col-sm-8" style={{ color: getDynamicColor(ticket.location), fontWeight: '500' }}>{ticket.location || '-'}</dd>
              <dt className="col-sm-4">Status</dt><dd className="col-sm-8" style={{ color: getStatusColor(ticket.status, statuses), fontWeight: '500' }}>{ticket.status}</dd>
              <dt className="col-sm-4">Priority</dt><dd className="col-sm-8" style={{ color: getPriorityColor(ticket.priority), fontWeight: '500' }}>{ticket.priority}</dd>
              <dt className="col-sm-4">Description Issue</dt><dd className="col-sm-8">{categories.find(c => c.id == ticket.category_id)?.name || ticket.category_name || '-'}</dd>
              <dt className="col-sm-4">Resolved by</dt><dd className="col-sm-8">{ticket.technician_name || 'Unassigned'}</dd>
              <dt className="col-sm-4">Due (SLA)</dt><dd className="col-sm-8">{new Date(ticket.due_at).toLocaleString()}</dd>
            </dl>
            <div className="border-top pt-3">
              <strong className="small d-block mb-1 text-muted">Description</strong>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3">
                <strong className="small">Attachments</strong>
                <ul className="list-unstyled small">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <a href={`${process.env.REACT_APP_API_URL?.replace('/api','')}/uploads/${a.file_path}`} target="_blank" rel="noreferrer">
                        <i className="bi bi-paperclip me-1"></i>{a.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header">Comments</div>
          <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
            {comments.map((c) => (
              <div key={c.id} className={`mb-3 p-2 rounded ${c.is_internal ? 'bg-warning-subtle' : 'bg-body-tertiary'}`}>
                <div className="d-flex justify-content-between">
                  <strong className="small">{c.author_name} {c.is_internal && <span className="badge bg-warning text-dark ms-1">Internal</span>}</strong>
                  <span className="text-muted small">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className="small mt-1">{c.comment}</div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-muted small">No comments yet</p>}
          </div>
          <div className="card-footer">
            {error && <div className="alert alert-danger py-1 small">{error}</div>}
            {user.role === 'Admin' ? (
              <form onSubmit={submitComment}>
                <textarea className="form-control mb-2" rows={3} placeholder="Write a reply..."
                  value={comment} onChange={(e) => setComment(e.target.value)} required />
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex gap-2 align-items-center">
                    <input type="file" multiple className="form-control form-control-sm" style={{ width: 220 }}
                      onChange={(e) => setFiles(Array.from(e.target.files))} />
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)} id="internalNote" />
                      <label className="form-check-label small" htmlFor="internalNote">Internal note</label>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm">Send</button>
                </div>
              </form>
            ) : (
              <div className="text-muted small text-center py-2">
                <i className="bi bi-info-circle me-1"></i> Comments are view only
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        {(user.role === 'Admin' || (ticket.requester_id === user?.id && ticket.status === 'New')) && (
          <div className="card shadow-sm mb-3 d-print-none">
            <div className="card-header">{user.role === 'Admin' ? 'Manage Ticket' : 'Revise Ticket'}</div>
            <div className="card-body">
              {user.role === 'Admin' && (
                <>
                  <div className="mb-2">
                    <label className="form-label small">Update Status</label>
                    <select className="form-select form-select-sm mb-2" value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value)}
                      style={{ color: getStatusColor(draftStatus, statuses), fontWeight: '500' }}>
                      {statuses.map((s) => <option key={s.id} value={s.name} style={{ color: s.color_code, fontWeight: '500' }}>{s.name}</option>)}
                    </select>
                  </div>

                  <label className="form-label small">Assign Resolved by</label>
                  <select className="form-select form-select-sm mb-2" value={draftAssignee}
                    onChange={(e) => setDraftAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.open_ticket_count} open)</option>
                    ))}
                  </select>
                </>
              )}

              <label className="form-label small">Priority</label>
              <select className="form-select form-select-sm mb-2" value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value)}
                style={{ color: getPriorityColor(draftPriority), fontWeight: '500' }}>
                {PRIORITIES.map((p) => <option key={p} value={p} style={{ color: getPriorityColor(p), fontWeight: '500' }}>{p}</option>)}
              </select>

              <label className="form-label small">Department</label>
              <select className="form-select form-select-sm mb-2" value={draftDepartment || ''}
                onChange={(e) => setDraftDepartment(e.target.value)}
                style={{ color: getDynamicColor(departments.find(d => d.id == draftDepartment)?.name), fontWeight: '500' }}>
                <option value="" style={{ color: '#212529' }}>Select...</option>
                {departments.map((d) => <option key={d.id} value={d.id} style={{ color: getDynamicColor(d.name), fontWeight: '500' }}>{d.name}</option>)}
              </select>

              <label className="form-label small">Issue</label>
              <select className="form-select form-select-sm mb-2" value={draftCategory || ''}
                onChange={(e) => setDraftCategory(e.target.value)}>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <label className="form-label small">Location</label>
              <select className="form-select form-select-sm mb-3" value={draftLocation || ''}
                onChange={(e) => setDraftLocation(e.target.value)}
                style={{ color: getDynamicColor(draftLocation), fontWeight: '500' }}>
                <option value="" style={{ color: '#212529' }}>Select...</option>
                {locations.map((loc, i) => <option key={i} value={loc} style={{ color: getDynamicColor(loc), fontWeight: '500' }}>{loc}</option>)}
              </select>

              <button 
                className="btn btn-primary btn-sm w-100" 
                onClick={saveTicketChanges}
                disabled={draftStatus === ticket.status && draftAssignee === (ticket.assigned_technician_id || '') && draftPriority === ticket.priority && draftDepartment == (ticket.department_id || '') && draftCategory == (ticket.category_id || '') && draftLocation === (ticket.location || '')}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {user.role === 'User' && ticket.status === 'Resolved' && !ticket.satisfaction_rating && (
          <div className="card shadow-sm mb-3">
            <div className="card-header">Rate Your Experience</div>
            <div className="card-body">
              <select className="form-select mb-2" value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
              </select>
              <button className="btn btn-success btn-sm w-100" onClick={submitRating}>Submit & Confirm Resolved</button>
              <p className="small text-muted mt-2 mb-0">Or reopen by leaving a comment above if unresolved.</p>
            </div>
          </div>
        )}

        <div className="card shadow-sm">
          <div className="card-header">History</div>
          <ul className="list-group list-group-flush small">
            {history.map((h) => (
              <li key={h.id} className="list-group-item">
                {h.old_status ? `${h.old_status} → ${h.new_status}` : `Created as ${h.new_status}`}
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {h.changed_by_name} · {new Date(h.changed_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger fw-bold fs-5">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Delete Ticket
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-4 text-secondary">
          Are you sure you want to permanently delete this ticket? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowDeleteConfirm(false)} className="fw-semibold px-4">
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteTicket} className="fw-semibold px-4 shadow-sm">
            Yes, Delete it
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Ticket Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-success fw-bold fs-5">
            <i className="bi bi-check-circle-fill me-2"></i>Confirm Ticket &amp; Reply to User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 pb-2">
          <div className="alert alert-info py-2 small mb-3">
            <i className="bi bi-info-circle me-1"></i>
            This will set the ticket status to <strong>In Progress</strong> and send an email notification to <strong>{ticket?.requester_email || ticket?.requester_name}</strong>.
          </div>
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
          <Button variant="light" onClick={() => setShowConfirmModal(false)} className="fw-semibold px-4">
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={confirmTicket}
            disabled={!confirmMessage.trim() || confirming}
            className="fw-semibold px-4 shadow-sm"
          >
            {confirming
              ? <><span className="spinner-border spinner-border-sm me-1"></span>Sending...</>
              : <><i className="bi bi-send me-1"></i>Confirm &amp; Send Email</>
            }
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quick Create User Modal */}
      <Modal show={showQuickUserModal} onHide={() => setShowQuickUserModal(false)} centered>
        <form onSubmit={handleQuickCreateUser}>
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold fs-5 text-primary">
              <i className="bi bi-person-plus-fill me-2"></i>Create User for Assignment
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-3 pb-2">
            <div className="mb-3">
              <label className="form-label small fw-semibold">Full Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g. John Doe" value={quickUserName} onChange={(e) => setQuickUserName(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Email (Optional)</label>
              <input type="email" className="form-control form-control-sm" placeholder="e.g. john@company.com" value={quickUserEmail} onChange={(e) => setQuickUserEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Role</label>
              <select className="form-select form-select-sm" value={quickUserRole} onChange={(e) => setQuickUserRole(e.target.value)}>
                <option value="Technician">Technician</option>
                <option value="Admin">Admin</option>
                <option value="User">User / Employee</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label small fw-semibold">Password</label>
              <input type="text" className="form-control form-control-sm" value={quickUserPassword} onChange={(e) => setQuickUserPassword(e.target.value)} required />
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-1">
            <Button variant="light" onClick={() => setShowQuickUserModal(false)} className="fw-semibold px-3 btn-sm">Cancel</Button>
            <Button variant="primary" type="submit" disabled={creatingUser} className="fw-semibold px-4 btn-sm shadow-sm">
              {creatingUser ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check2 me-1"></i>} Create &amp; Select
            </Button>
          </Modal.Footer>
        </form>
      </Modal>


    </div>
  );
}
