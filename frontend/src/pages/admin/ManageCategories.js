import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ManageCategories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');

  function load() { api.get('/categories').then((r) => setItems(r.data)).catch(console.error); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/categories', { name });
    setName('');
    load();
  }
  async function toggleActive(c) { await api.put(`/categories/${c.id}`, { name: c.name, is_active: !c.is_active }); load(); }
  async function remove(id) { await api.delete(`/categories/${id}`); load(); }

  return (
    <div>
      <h4 className="mb-3">Manage Categories</h4>
      <form onSubmit={add} className="d-flex gap-2 mb-3" style={{ maxWidth: 400 }}>
        <input className="form-control" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="card shadow-sm" style={{ maxWidth: 500 }}>
        <ul className="list-group list-group-flush">
          {items.map((c) => (
            <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>{c.name} {!c.is_active && <span className="badge bg-secondary ms-2">Inactive</span>}</span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(c)}>
                  {c.is_active ? 'Disable' : 'Enable'}
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c.id)}><i className="bi bi-trash"></i></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
