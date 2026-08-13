import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ employee_id: '', full_name: '', email: '', phone: '', password: '', role: 'User', department_id: '', location: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [editUser, setEditUser] = useState(null); // null = not editing
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');

  // Add User for Assign modal state
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [assignUserForm, setAssignUserForm] = useState({ employee_id: '', full_name: '', position: 'Technician', email: '', password: '12345678' });
  const [assignUserError, setAssignUserError] = useState('');

  async function createAssignUser(e) {
    e.preventDefault();
    setAssignUserError('');
    try {
      const empId = assignUserForm.employee_id || 'EMP' + Math.floor(1000 + Math.random() * 9000);
      const cleanId = empId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const formattedName = assignUserForm.position ? `${assignUserForm.full_name} (${assignUserForm.position})` : assignUserForm.full_name;
      const payload = {
        employee_id: empId,
        full_name: formattedName,
        email: `staff_${cleanId}_${Date.now()}@helpdesk.local`,
        password: assignUserForm.password || '12345678',
        role: 'Technician'
      };
      await api.post('/users', payload);
      setShowAssignUserModal(false);
      setAssignUserForm({ employee_id: '', full_name: '', position: '', email: '', password: '12345678' });
      setAssignUserError('');
      loadUsers();
    } catch (err) {
      setAssignUserError(err.response?.data?.message || 'Failed to add user for assign');
    }
  }

  function loadUsers() {
    api.get('/users').then(res => {
      const saved = res.data;
      api.get('/departments').then(deptRes => {
        const depts = deptRes.data;
        const enriched = saved.map(u => ({
          ...u,
          department_name: depts.find(d => String(d.id) === String(u.department_id))?.name || '-'
        }));
        setUsers(enriched);
      });
    }).catch(console.error);
  }

  useEffect(() => {
    loadUsers();
    api.get('/departments').then((r) => setDepartments(r.data)).catch(console.error);
    // Location is just simple UI mock for now, can be replaced later
    const savedLocs = JSON.parse(localStorage.getItem('app_locations') || '[]');
    setLocations(savedLocs);
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (!payload.email) payload.email = `${payload.employee_id || Date.now()}@company.com`;
      await api.post('/users', payload);
      
      const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
      if (config.sender_email && config.app_password) {
        api.post('/email/send-welcome', {
          to_email: payload.email,
          to_name: payload.full_name,
          password: payload.password,
          config
        }).catch(err => console.error('Failed to send welcome email', err));
      }

      setForm({ employee_id: '', full_name: '', email: '', phone: '', password: '', role: 'User', department_id: '', location: locations.length > 0 ? locations[0] : '' });
      setShowForm(false);
      loadUsers();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create user'); }
  }

  async function toggleActive(u) {
    try {
      await api.put(`/users/${u.id}`, { is_active: u.is_active ? 0 : 1 });
      loadUsers();
    } catch (err) { console.error('Toggle active failed', err); }
  }

  async function deleteUser(u) {
    if (!window.confirm(`Are you sure you want to permanently delete "${u.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      loadUsers();
    } catch (err) { 
      const msg = err.response?.data?.message || err.message;
      alert(`Delete failed: ${msg}`);
      console.error('Delete failed', err); 
    }
  }

  function openEdit(u) {
    setEditUser(u);
    let rawName = u.full_name || '';
    let parsedPos = '';
    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      rawName = match[1].trim();
      parsedPos = match[2].trim();
    }
    setEditForm({
      full_name: rawName,
      position: parsedPos,
      email: u.email || '',
      role: u.role || 'User',
      department_id: u.department_id || '',
      location: u.location || (locations.length > 0 ? locations[0] : ''),
      employee_id: u.employee_id || '',
      phone: u.phone || '',
      password: ''
    });
    setEditError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError('');
    const isAssignUser = editUser.role === 'Technician' || userTab === 'assign';
    const finalFullName = isAssignUser && editForm.position
      ? `${editForm.full_name} (${editForm.position})`
      : editForm.full_name;

    if (!finalFullName || (!isAssignUser && !editForm.email)) {
      setEditError('Full Name is required.');
      return;
    }
    
    try {
      const payload = {
        full_name: finalFullName,
        email: editForm.email || `staff_${(editForm.employee_id || 'emp').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@helpdesk.local`,
        role: editForm.role,
        department_id: editForm.department_id,
        location: editForm.location,
        employee_id: editForm.employee_id,
        phone: editForm.phone,
        ...(editForm.password ? { password: editForm.password } : {})
      };
      await api.put(`/users/${editUser.id}`, payload);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user');
    }
  }

  const [userTab, setUserTab] = useState('user');

  const filteredUsers = users;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 text-secondary fw-normal">Manage Users</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-warning text-white btn-sm px-3 rounded-pill" onClick={() => setShowForm(!showForm)}>
            <i className="bi bi-plus-circle me-1"></i>New User
          </button>
        </div>
      </div>



      {/* Create User Modal */}
      {showForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={createUser}>
                <div className="modal-header">
                  <h5 className="modal-title fs-5">
                    <i className="bi bi-person-plus me-2"></i>Create New User
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Employee ID</label>
                      <input className="form-control" placeholder="Employee ID" value={form.employee_id}
                        onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                      <input className="form-control" placeholder="Full Name" required value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                      <input type="email" className="form-control" placeholder="Email" required value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Password <span className="text-danger">*</span></label>
                      <input type="password" className="form-control" placeholder="Password" required minLength={6} value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Role</label>
                      <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        <option value="User">Normal User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Department</label>
                      <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                        <option value="">No department</option>
                        {departments.map((d, i) => <option key={d.id} value={d.id}>{i + 1}. {d.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Location <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.location || (locations.length > 0 ? locations[0] : '')} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                        {locations.map((loc, i) => <option key={i} value={loc}>{i + 1}. {loc}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-white fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Create User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={saveEdit} id="editForm">
                <div className={`modal-header ${editUser.role === 'Technician' ? 'bg-success text-white' : ''}`}>
                  <h5 className="modal-title fs-5">
                    <i className="bi bi-pencil-square me-2"></i>
                    {editUser.role === 'Technician' ? 'Edit User for Assign' : 'Edit User'}
                  </h5>
                  <button
                    type="button"
                    className={`btn-close ${editUser.role === 'Technician' ? 'btn-close-white' : ''}`}
                    onClick={() => setEditUser(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  {editError && <div className="alert alert-danger py-2">{editError}</div>}
                  {editUser.role === 'Technician' ? (
                    <div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">ID (Employee/Staff ID) <span className="text-danger">*</span></label>
                        <input
                          className="form-control"
                          required
                          value={editForm.employee_id}
                          onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Name (Full Name) <span className="text-danger">*</span></label>
                        <input
                          className="form-control"
                          required
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Position <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. IT Support, Network Technician, IT Officer..."
                          list="editPositionOptions"
                          required
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                        />
                        <datalist id="editPositionOptions">
                          <option value="IT Support / Technician" />
                          <option value="IT Officer" />
                          <option value="Network Engineer" />
                          <option value="System Administrator" />
                          <option value="Hardware Specialist" />
                          <option value="IT Admin / Manager" />
                        </datalist>
                        <div className="form-text">Choose from list or type any custom position title.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Employee ID</label>
                        <input className="form-control" value={editForm.employee_id}
                          onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                        <input className="form-control" required value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                        <input type="email" className="form-control" required value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Phone</label>
                        <input className="form-control" value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Role</label>
                        <select className="form-select" value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                          <option value="User">Normal User</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Department</label>
                        <select className="form-select" value={editForm.department_id}
                          onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}>
                          <option value="">No department</option>
                          {departments.map((d, i) => <option key={d.id} value={d.id}>{i + 1}. {d.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Location <span className="text-danger">*</span></label>
                        <select className="form-select" required value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}>
                          {locations.map((loc, i) => <option key={i} value={loc}>{i + 1}. {loc}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">New Password <span className="text-muted small">(leave blank to keep current)</span></label>
                        <input type="password" className="form-control" placeholder="Enter new password to change..."
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-check-circle me-1"></i>Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add User for Assign Modal */}
      {showAssignUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={createAssignUser}>
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title fs-5"><i className="bi bi-person-badge me-2"></i>Add User for Assign</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowAssignUserModal(false)}></button>
                </div>
                <div className="modal-body">
                  {assignUserError && <div className="alert alert-danger py-2 mb-3"><i className="bi bi-exclamation-triangle-fill me-2"></i>{assignUserError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">ID (Employee/Staff ID) <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="e.g. EMP001" required value={assignUserForm.employee_id}
                      onChange={(e) => setAssignUserForm({ ...assignUserForm, employee_id: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Name (Full Name) <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="e.g. John Doe" required value={assignUserForm.full_name}
                      onChange={(e) => setAssignUserForm({ ...assignUserForm, full_name: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Position <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. IT Support, Network Technician, IT Officer..."
                      list="positionOptions"
                      required
                      value={assignUserForm.position}
                      onChange={(e) => setAssignUserForm({ ...assignUserForm, position: e.target.value })}
                    />
                    <datalist id="positionOptions">
                      <option value="IT Support / Technician" />
                      <option value="IT Officer" />
                      <option value="Network Engineer" />
                      <option value="System Administrator" />
                      <option value="Hardware Specialist" />
                      <option value="IT Admin / Manager" />
                    </datalist>
                    <div className="form-text">Choose from list or type any custom position title.</div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowAssignUserModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Create &amp; Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td 
                    className="fw-semibold"
                    onClick={() => openEdit(u)}
                    style={{ cursor: 'pointer' }}
                    title="Click to edit user"
                  >
                    {u.full_name}
                  </td>
                  <td className="text-muted small">{u.email}</td>
                  <td><span className={`badge ${u.role === 'Admin' ? 'bg-danger' : (u.role === 'User' ? 'bg-warning text-dark' : 'bg-primary')}`}>{u.role}</span></td>
                  <td>{u.department_name || '-'}</td>
                  <td>{u.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                  <td>
                    <div className="btn-group btn-group-sm shadow-sm">
                      <button className="btn btn-outline-warning" onClick={() => openEdit(u)} title="Edit user">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className={`btn ${u.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button className="btn btn-outline-danger" onClick={() => deleteUser(u)} title="Delete user permanently">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
