import { useEffect, useState } from 'react';
import api from '../../services/api';

const TYPES = ['New', 'In Progress', 'Complete'];

export default function ManageStatuses() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('New');
  const [colorCode, setColorCode] = useState('#6c757d');

  function load() { api.get('/statuses').then((r) => setItems(r.data)).catch(console.error); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/statuses', { name, type, color_code: colorCode });
      setName('');
      setType('New');
      setColorCode('#6c757d');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add status');
    }
  }

  async function remove(id) {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    try {
      await api.delete(`/statuses/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete status');
    }
  }

  return (
    <div>
      <h4 className="mb-3">Manage Ticket Statuses</h4>
      
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={add} className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1">Status Name</label>
              <input className="form-control" placeholder="e.g., On Hold" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Type (Dashboard Group)</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Color Code</label>
              <input type="color" className="form-control form-control-color w-100" value={colorCode} onChange={(e) => setColorCode(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100">Add Status</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Preview</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="fw-medium">{s.name}</td>
                  <td><span className="badge bg-secondary">{s.type}</span></td>
                  <td>
                    <span className="badge" style={{ backgroundColor: s.color_code }}>{s.name}</span>
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s.id)}>
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">No statuses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
