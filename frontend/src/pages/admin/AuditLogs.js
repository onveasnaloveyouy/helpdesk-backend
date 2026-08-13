import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/activity-logs', { params: { page, limit: 50 } }).then((r) => setLogs(r.data)).catch(console.error);
  }, [page]);

  return (
    <div>
      <h4 className="mb-3">Audit Logs</h4>
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light"><tr><th>User</th><th>Action</th><th>Details</th><th>IP</th><th>Time</th></tr></thead>
            <tbody>
              {logs.data.map((l) => (
                <tr key={l.id}>
                  <td>{l.full_name || 'System'}</td>
                  <td><span className="badge bg-secondary">{l.action}</span></td>
                  <td className="small">{l.details}</td>
                  <td className="small">{l.ip_address}</td>
                  <td className="small">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <span className="small text-muted">Total: {logs.total}</span>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button className="btn btn-outline-secondary" onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
