import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [filters, setFilters] = useState({ period: 'monthly', department_id: '', technician_id: '', priority: '' });

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data)).catch(console.error);
    api.get('/users/technicians').then((r) => setTechnicians(r.data)).catch(console.error);
  }, []);

  function cleanParams() {
    const params = { ...filters };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    return params;
  }

  async function runReport() {
    try {
      const { data } = await api.get('/reports/data', { params: cleanParams() });
      setRows(data);
    } catch (error) {
      console.error(error);
      setRows([]);
    }
  }
  useEffect(() => { runReport(); /* eslint-disable-next-line */ }, []);

  function exportFile(type) {
    const params = new URLSearchParams(cleanParams()).toString();
    const token = localStorage.getItem('token');
    const url = `${process.env.REACT_APP_API_URL}/reports/export/${type}?${params}`;
    // Use fetch to include Authorization header, then trigger a download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `ticket-report.${type === 'excel' ? 'xlsx' : 'pdf'}`;
        link.click();
      });
  }

  return (
    <div>
      <h4 className="mb-3">Reports</h4>
      <div className="card shadow-sm mb-3">
        <div className="card-body row g-2 align-items-end">
          <div className="col-md-2">
            <label className="form-label small">Period</label>
            <select className="form-select form-select-sm" value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Department</label>
            <select className="form-select form-select-sm" value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}>
              <option value="">All</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Technician</label>
            <select className="form-select form-select-sm" value={filters.technician_id}
              onChange={(e) => setFilters({ ...filters, technician_id: e.target.value })}>
              <option value="">All</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small">Priority</label>
            <select className="form-select form-select-sm" value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All</option>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary btn-sm w-100" onClick={runReport}>Run Report</button>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-success btn-sm" onClick={() => exportFile('excel')}>
          <i className="bi bi-file-earmark-excel me-1"></i>Export Excel
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => exportFile('pdf')}>
          <i className="bi bi-file-earmark-pdf me-1"></i>Export PDF
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr><th>Ticket #</th><th>Subject</th><th>Priority</th><th>Status</th><th>Requester</th><th>Technician</th><th>Created</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.ticket_number}</td><td>{r.subject}</td><td>{r.priority}</td><td>{r.status}</td>
                  <td>{r.requester}</td><td>{r.technician || '-'}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-3">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
