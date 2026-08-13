import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Faq() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState({ question: '', answer: '' });
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  function load() { api.get('/faqs').then((r) => setFaqs(r.data)).catch(console.error); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    await api.post('/faqs', form);
    setForm({ question: '', answer: '' });
    setShowForm(false);
    load();
  }
  async function remove(id) { await api.delete(`/faqs/${id}`); load(); }

  return (
    <div>
      <div className="d-flex justify-content-between mb-3">
        <h4>Knowledge Base / FAQ</h4>
        {(user.role === 'Technician' || user.role === 'Admin') && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <i className="bi bi-plus-circle me-1"></i>Add FAQ
          </button>
        )}
      </div>

      {showForm && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form onSubmit={add}>
              <input className="form-control mb-2" placeholder="Question" required
                value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              <textarea className="form-control mb-2" rows={3} placeholder="Answer" required
                value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
              <button className="btn btn-success btn-sm">Save</button>
            </form>
          </div>
        </div>
      )}

      <div className="accordion" id="faqAccordion">
        {faqs.map((f, i) => (
          <div className="accordion-item" key={f.id}>
            <h2 className="accordion-header">
              <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#faq${f.id}`}>
                {f.question}
              </button>
            </h2>
            <div id={`faq${f.id}`} className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <div className="accordion-body d-flex justify-content-between">
                <span>{f.answer}</span>
                {user.role === 'Admin' && (
                  <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => remove(f.id)}><i className="bi bi-trash"></i></button>
                )}
              </div>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p className="text-muted">No FAQs yet.</p>}
      </div>
    </div>
  );
}
