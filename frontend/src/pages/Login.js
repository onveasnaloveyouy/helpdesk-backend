import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });
      const { token, user } = response.data;
      
      // Pass token to auth context (assuming it stores it)
      await login(user, token);
      
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-body-tertiary">
      <div className="card shadow-sm" style={{ width: 400 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img 
              src="/logo1.jpg" 
              alt="Logo" 
              style={{ height: '80px', objectFit: 'contain' }} 
              className="mb-3"
              onError={(e) => {
                e.target.style.display = 'none';
                document.getElementById('login-fallback-icon').style.display = 'block';
              }}
            />
            <i id="login-fallback-icon" className="bi bi-shield-lock text-primary mb-3" style={{ fontSize: '3rem', display: 'none' }}></i>
            <h4 className="mt-1">Request Tickets System</h4>
          </div>
          {successMessage && <div className="alert alert-success p-2 text-center">{successMessage}</div>}
          {error && <div className="alert alert-danger p-2 text-center">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email}
                placeholder="user@example.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <div className="input-group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  className="btn btn-outline-secondary" 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                </button>
              </div>
            </div>
            <div className="d-grid gap-3">
              <button 
                type="submit"
                className="btn btn-primary btn-lg" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
          <div className="text-center mt-2 small">
            <Link to="/forgot-password" className="text-muted">Forgot password?</Link>
          </div>
          <div className="text-center mt-2 small">
            Don't have an account? <Link to="/register">Create one here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
