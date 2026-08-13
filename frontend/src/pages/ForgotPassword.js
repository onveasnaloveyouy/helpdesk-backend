import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function sendResetEmail(toEmail, code, name) {
    const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
    if (!config.sender_email || !config.app_password) return false;
    try {
      const res = await api.post('/email/send-otp', {
        to_email: toEmail,
        to_name: name || toEmail,
        otp_code: code,
        subject: 'Password Reset Code - IT Ticket System',
        config
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  // Step 1 — verify email exists
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check admin account locally, otherwise use backend
    const isAdmin = email === 'admin@company.com' || email === 'admin@helpdesk.local';
    
    if (!isAdmin) {
      try {
        const { data } = await api.post('/auth/check-user', { email });
        // If check-user returns available: true, the email is NOT in the database!
        if (data.available) {
          setError('No account found with that email address.');
          setLoading(false);
          return;
        }
      } catch (err) {
        // If it throws a 400 error, it means the email EXISTS, which is exactly what we want!
        if (err.response?.status !== 400) {
          setError('An error occurred. Please try again.');
          setLoading(false);
          return;
        }
      }
    }

    const code = generateCode();
    setGeneratedOtp(code);
    localStorage.setItem('reset_otp', code);
    localStorage.setItem('reset_email', email);
    await sendResetEmail(email, code);

    setStep(2);
    setResendTimer(60);
    setLoading(false);
  }

  // Step 2 — verify OTP
  function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    const saved = localStorage.getItem('reset_otp');
    if (otp !== saved) {
      setError('Incorrect code. Please try again.');
      return;
    }
    setStep(3);
  }

  // Step 3 — set new password
  async function handlePasswordReset(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const resetEmail = localStorage.getItem('reset_email');
    try {
      await api.post('/auth/reset-password-otp', {
        email: resetEmail,
        newPassword
      });
      localStorage.removeItem('reset_otp');
      localStorage.removeItem('reset_email');
      navigate('/login', { state: { message: '✅ Password reset successfully! Please log in with your new password.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    }
  }

  async function handleResend() {
    const code = generateCode();
    setGeneratedOtp(code);
    localStorage.setItem('reset_otp', code);
    await sendResetEmail(email, code);
    setResendTimer(60);
    setOtp('');
    setError('');
  }

  // ── Step 1: Enter Email ──────────────────────────────────────────────────
  if (step === 1) return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary">
      <div className="card shadow-sm" style={{ width: 420 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img src="/logo1.jpg" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} className="mb-3"
              onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 65, height: 65 }}>
              <i className="bi bi-key-fill text-warning" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <h5 className="fw-bold">Forgot Password?</h5>
            <p className="text-muted small">Enter your email address and we'll send you a reset code.</p>
          </div>
          {error && <div className="alert alert-danger py-2 text-center small">{error}</div>}
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                  : <><i className="bi bi-send me-2"></i>Send Reset Code</>
                }
              </button>
            </div>
          </form>
          <div className="text-center small">
            <Link to="/login"><i className="bi bi-arrow-left me-1"></i>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Enter OTP ────────────────────────────────────────────────────
  if (step === 2) return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary">
      <div className="card shadow-sm text-center" style={{ width: 420 }}>
        <div className="card-body p-4">
          <div className="mb-4">
            <img src="/logo1.jpg" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} className="mb-3"
              onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 65, height: 65 }}>
              <i className="bi bi-envelope-check text-primary" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <h5 className="fw-bold">Check Your Email</h5>
            <p className="text-muted small">
              We sent a 6-digit reset code to:<br />
              <strong className="text-dark">{email}</strong>
            </p>
          </div>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form onSubmit={handleOtpSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Enter Reset Code</label>
              <input
                type="text"
                className="form-control form-control-lg text-center fw-bold"
                style={{ letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="______"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary btn-lg" disabled={otp.length !== 6}>
                <i className="bi bi-check-circle me-2"></i>Verify Code
              </button>
            </div>
          </form>
          <div className="small text-muted">
            Didn't receive the code?{' '}
            {resendTimer > 0
              ? <span>Resend in {resendTimer}s</span>
              : <button className="btn btn-link btn-sm p-0" onClick={handleResend}>Resend Code</button>
            }
          </div>
          <div className="mt-2 small">
            <button className="btn btn-link btn-sm text-secondary p-0" onClick={() => { setStep(1); setError(''); setOtp(''); }}>
              <i className="bi bi-arrow-left me-1"></i>Change email
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3: New Password ─────────────────────────────────────────────────
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary">
      <div className="card shadow-sm" style={{ width: 420 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img src="/logo1.jpg" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} className="mb-3"
              onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 65, height: 65 }}>
              <i className="bi bi-lock-fill text-success" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <h5 className="fw-bold">Set New Password</h5>
            <p className="text-muted small">Choose a strong new password for your account.</p>
          </div>
          {error && <div className="alert alert-danger py-2 small text-center">{error}</div>}
          <form onSubmit={handlePasswordReset}>
            <div className="mb-3">
              <label className="form-label">New Password <span className="text-danger">*</span></label>
              <div className="input-group">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  placeholder="Min. 6 characters"
                />
                <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd(!showPwd)} tabIndex="-1">
                  <i className={showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">Confirm New Password <span className="text-danger">*</span></label>
              <div className="input-group">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                />
                <button className="btn btn-outline-secondary" type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex="-1">
                  <i className={showConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                </button>
              </div>
            </div>
            <div className="d-grid">
              <button type="submit" className="btn btn-success btn-lg">
                <i className="bi bi-check-circle me-2"></i>Reset Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
