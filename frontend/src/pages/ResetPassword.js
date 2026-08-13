import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/reset-password', { token: params.get('token'), newPassword });
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-body-tertiary">
      <div className="card shadow-sm" style={{ width: 380 }}>
        <div className="card-body p-4">
          <h5 className="mb-3">Reset Password</h5>
          {message && <div className="alert alert-success py-2">{message}</div>}
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" minLength={8} required
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100">Reset Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
