import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [successTicketId, setSuccessTicketId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [form, setForm] = useState({
    department_id: user?.department_id || '', category_id: '', priority: 'Medium',
    subject: '', description: '', asset_number: '', location: '', phone: user?.phone || '', email: user?.email || '', name: user?.full_name || '', sex: user?.sex || ''
  });

  useEffect(() => {
    api.get('/categories').then((r) => {
      let itCategories = r.data.filter(c => 
        c.name.startsWith('Hardware') || 
        c.name.startsWith('Software') || 
        c.name.startsWith('Network') || 
        c.name === 'Other'
      );
      // Sort alphabetically, but put 'Other' at the very bottom
      itCategories.sort((a, b) => {
        if (a.name === 'Other') return 1;
        if (b.name === 'Other') return -1;
        return a.name.localeCompare(b.name);
      });
      setCategories(itCategories);
    }).catch(console.error);
    api.get('/users').then((r) => setUsers(r.data)).catch(console.error);
    // Load Locations
    const savedLocs = localStorage.getItem('app_locations');
    if (savedLocs) {
      setLocations(JSON.parse(savedLocs));
    } else {
      setLocations(['Administration Office', 'Warehouse Office', 'Finance Office', 'Marketing Office', 'Accounting Office', 'IT Office', 'Engineering Office', 'HR Office', 'Sales Office', 'Procurement Office', 'NBC Office']);
    }

    // Load Departments from API
    api.get('/departments').then((r) => setDepartments(r.data)).catch(console.error);
  }, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('attachments', f));
      const { data } = await api.post('/tickets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      // Hit the email server to send the notification
      try {
        const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
        if (config.sender_email && config.receive_notifications !== false) {
          await api.post('/email/send-ticket', {
            config,
            ticket: {
              id: data.id,
              ticket_number: data.ticket_number,
              subject: form.subject,
              description: form.description,
              requester_name: form.name,
              requester_email: form.email,
              priority: form.priority,
              department_name: departments.find(d => d.id == form.department_id)?.name || 'N/A',
              category_name: categories.find(c => c.id == form.category_id)?.name || 'N/A',
              location: form.location || 'N/A',
              status: 'New'
            }
          });
        }
      } catch (emErr) {
        console.error('Email sending failed (non-blocking):', emErr);
      }

      setSuccessTicketId(data.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating ticket');
    } finally {
      setSubmitting(false);
    }
  }

  if (successTicketId) {
    return (
      <div className="card shadow-sm w-100 text-center py-5" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
          <h3 className="mt-3">Ticket Submitted Successfully!</h3>
          <p className="text-muted">Your request has been securely recorded in the system.</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate(`/tickets/${successTicketId}`)}>
            View Ticket Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm w-100" style={{ maxWidth: 800 }}>
      <div className="card-header text-center bg-white py-4 border-bottom-0">
        <img 
          src="/logo1.jpg" 
          alt="Northbridge Communities Logo" 
          style={{ height: '100px', objectFit: 'contain' }} 
          className="mb-2"
          onError={(e) => {
            e.target.style.display = 'none';
            document.getElementById('fallback-icon').style.display = 'block';
          }}
        />
        <i id="fallback-icon" className="bi bi-buildings text-primary mb-2" style={{ fontSize: '3rem', display: 'none' }}></i>
        <h4 className="mb-1 fw-bold" style={{ color: '#1e293b' }}>Northbridge Communities</h4>
        <h6 className="mb-0 text-muted">Submit New Ticket</h6>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name *</label>
              {user?.role === 'Admin' || user?.role === 'Technician' ? (
                <select className="form-select" required value={form.name || ''} onChange={(e) => update('name', e.target.value)}>
                  <option value="">Select User...</option>
                  {users.map((u) => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-control bg-light" value={form.name || ''} readOnly />
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Sex *</label>
              {user?.role === 'Admin' || user?.role === 'Technician' ? (
                <select className="form-select" required value={form.sex || ''} onChange={(e) => update('sex', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <input type="text" className="form-control bg-light" value={form.sex || ''} readOnly />
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              {user?.role === 'Admin' || user?.role === 'Technician' ? (
                <input type="email" className="form-control" value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="Enter email address" />
              ) : (
                <input type="email" className="form-control bg-light" value={form.email || ''} readOnly />
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              {user?.role === 'Admin' || user?.role === 'Technician' ? (
                <input type="tel" className="form-control" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="Enter phone number" />
              ) : (
                <input type="tel" className="form-control bg-light" value={form.phone || ''} readOnly />
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Department *</label>
              <select className="form-select" required value={form.department_id}
                onChange={(e) => update('department_id', e.target.value)}>
                <option value="">Select...</option>
                {departments.map((d, i) => <option key={d.id} value={d.id}>{i + 1}. {d.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.location} onChange={(e) => update('location', e.target.value)}>
                <option value="">Select...</option>
                {locations.map((loc, idx) => (
                  <option key={idx} value={loc}>{idx + 1}. {loc}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Priority *</label>
              <select className="form-select" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Description Issue *</label>
              <select 
                className="form-select mb-2" 
                required 
                value={form.category_id}
                onChange={(e) => {
                  const valId = e.target.value;
                  const cat = categories.find(c => c.id.toString() === valId);
                  const valName = cat ? cat.name : '';
                  
                  setIssueType(valName);
                  if (valName && !valName.startsWith('Other')) {
                    setForm(f => ({ ...f, category_id: valId, subject: valName, description: valName }));
                  } else {
                    setForm(f => ({ ...f, category_id: valId, subject: 'Other IT Issue', description: '' }));
                  }
                }}
              >
                <option value="">Select an issue...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {issueType.startsWith('Other') && (
                <textarea 
                  className="form-control mt-2" 
                  rows={4} 
                  required 
                  placeholder="Please describe your issue in detail..." 
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)} 
                />
              )}
            </div>
          </div>
          <div className="mt-4 d-flex gap-2">
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
