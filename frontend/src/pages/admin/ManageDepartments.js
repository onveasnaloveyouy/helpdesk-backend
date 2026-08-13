import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ManageDepartments() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  function loadAll() {
    api.get('/departments').then(res => {
      setItems(res.data);
    }).catch(err => {
      setItems([{ id: 999, name: 'Error fetching: ' + err.message }]);
      console.error(err);
    });

    api.get('/users').then(res => {
      setUsers(res.data);
    }).catch(console.error);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingId) {
        await api.put(`/departments/${editingId}`, { name: name.trim() });
      } else {
        await api.post('/departments', { name: name.trim() });
      }
      setName('');
      setEditingId(null);
      setShowAddForm(false);
      loadAll();
    } catch (err) { console.error(err); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await api.put(`/departments/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      loadAll();
    } catch (err) { console.error(err); }
  }

  function handleCancel() {
    setName('');
    setShowAddForm(false);
  }

  async function remove(id) {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      loadAll();
    } catch (err) { console.error(err); }
  }



  return (
    <div className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 text-secondary fw-normal">Manage Departments</h4>
        <button className="btn btn-warning text-white btn-sm px-3 rounded-pill" onClick={() => {
          setName('');
          setShowAddForm(true);
        }}>
          <i className="bi bi-plus-circle me-1"></i>New Department
        </button>
      </div>

      {/* Add Modal */}
      {showAddForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-5"><i className="bi bi-plus-circle me-2"></i>Create New Department</h5>
                  <button type="button" className="btn-close" onClick={handleCancel}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Department Name <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. IT Department" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-white fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Departments Table */}
      <div className="bg-white rounded shadow-sm border overflow-hidden">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '50px' }}>No.</th>
              <th>Department Name</th>
              <th>Users Count</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-muted py-4">No departments added.</td>
              </tr>
            ) : (
              items.map((d, idx) => {
                const count = users.filter(u => String(u.department_id) === String(d.id)).length;
                return (
                  <tr key={d.id}>
                    <td>{idx + 1}</td>
                    <td 
                      className="fw-semibold" 
                      onClick={() => { setEditingId(d.id); setEditName(d.name); }}
                      style={{ cursor: 'pointer' }}
                      title="Click to edit department"
                    >
                      {d.name}
                    </td>
                    <td><span className="badge bg-secondary">{count}</span></td>
                    <td>
                      <div className="btn-group btn-group-sm shadow-sm">
                        <button className="btn btn-outline-warning" onClick={() => { setEditingId(d.id); setEditName(d.name); }} title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => remove(d.id)} title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Edit Modal */}
      {editingId !== null && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={saveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-5">
                    <i className="bi bi-pencil-square me-2"></i>Edit Department
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setEditingId(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Department Name <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setEditingId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-white fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
