import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({ employee_id: '', full_name: '', sex: '', position: '', department_id: '', location: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);

  // OTP verification states
  const [step, setStep] = useState(1); // 1 = form, 2 = otp verification
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(console.error);
    const savedLocs = localStorage.getItem('app_locations');
    if (savedLocs) {
      setLocations(JSON.parse(savedLocs));
    } else {
      const defaults = ['Administration Office', 'Warehouse Office', 'Finance Office', 'Marketing Office', 'Accounting Office', 'IT Office', 'Engineering Office', 'HR Office', 'Sales Office', 'Procurement Office', 'NBC Office'];
      setLocations(defaults);
      localStorage.setItem('app_locations', JSON.stringify(defaults));
    }
    const timer = setTimeout(() => {
      setForm({ employee_id: '', full_name: '', sex: '', position: '', department_id: '', location: '', phone: '', email: '', password: '' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function sendOtpEmail(email, name, otp) {
    const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
    if (!config.sender_email || !config.app_password) return false;
    try {
      const response = await api.post('/email/send-otp', { to_email: email, to_name: name, otp_code: otp, config });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/check-user', { email: form.email, employee_id: form.employee_id });

      // Generate OTP and move to verification step
      const otp = generateOtp();
      setGeneratedOtp(otp);

      // Try to send real email; store OTP for mock verification
      await sendOtpEmail(form.email, form.full_name, otp);
      localStorage.setItem('pending_otp', otp);
      localStorage.setItem('pending_otp_email', form.email);

      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setOtpError('');

    const savedOtp = localStorage.getItem('pending_otp');
    if (inputOtp !== savedOtp) {
      setOtpError('Incorrect verification code. Please try again.');
      return;
    }

    // OTP correct — create the account
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      localStorage.removeItem('pending_otp');
      localStorage.removeItem('pending_otp_email');
      navigate('/login', { state: { message: 'Account created successfully! Please log in.' } });
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const otp = generateOtp();
    setGeneratedOtp(otp);
    localStorage.setItem('pending_otp', otp);
    await sendOtpEmail(form.email, form.full_name, otp);
    setResendTimer(60);
    setOtpError('');
    setInputOtp('');
  }

  // ─── STEP 2: OTP Verification Screen ─────────────────────────────────────
  if (step === 2) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary py-5">
        <div className="card shadow-sm" style={{ width: 450 }}>
          <div className="card-body p-4 text-center">
            <div className="mb-4">
              <img
                src="/logo1.jpg"
                alt="Logo"
                style={{ height: '70px', objectFit: 'contain' }}
                className="mb-3"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 70, height: 70 }}>
                <i className="bi bi-envelope-check text-success" style={{ fontSize: '2rem' }}></i>
              </div>
              <h5 className="fw-bold">Check Your Email</h5>
              <p className="text-muted small">
                We sent a 6-digit verification code to:<br />
                <strong className="text-dark">{form.email}</strong>
              </p>
            </div>



            {otpError && <div className="alert alert-danger py-2 small">{otpError}</div>}

            <form onSubmit={handleVerifyOtp}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Enter Verification Code</label>
                <input
                  type="text"
                  className="form-control form-control-lg text-center fw-bold"
                  style={{ letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="______"
                  maxLength={6}
                  required
                  autoFocus
                />
                <div className="text-muted small mt-1">Enter the 6-digit code</div>
              </div>

              <div className="d-grid mb-3">
                <button type="submit" className="btn btn-success btn-lg" disabled={loading || inputOtp.length !== 6}>
                  {loading ? 'Verifying...' : <><i className="bi bi-check-circle me-2"></i>Verify & Create Account</>}
                </button>
              </div>
            </form>

            <div className="text-center small text-muted">
              Didn't receive the code?{' '}
              {resendTimer > 0
                ? <span className="text-muted">Resend in {resendTimer}s</span>
                : <button className="btn btn-link btn-sm p-0" onClick={handleResend}>Resend Code</button>
              }
            </div>

            <div className="text-center mt-3 small">
              <button className="btn btn-link btn-sm text-secondary p-0" onClick={() => { setStep(1); setInputOtp(''); setOtpError(''); }}>
                <i className="bi bi-arrow-left me-1"></i>Back to form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 1: Registration Form ────────────────────────────────────────────
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary py-5">
      <div className="card shadow-sm" style={{ width: 600 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img
              src="/logo1.jpg"
              alt="Logo"
              style={{ height: '80px', objectFit: 'contain' }}
              className="mb-3"
              onError={(e) => {
                e.target.style.display = 'none';
                document.getElementById('register-fallback-icon').style.display = 'block';
              }}
            />
            <i id="register-fallback-icon" className="bi bi-shield-lock text-primary mb-3" style={{ fontSize: '3rem', display: 'none' }}></i>
            <h4 className="mt-1">Create an Account</h4>
            <p className="text-muted small">Register to submit IT requests</p>
          </div>
          {error && <div className="alert alert-danger p-2 text-center">{error}</div>}
          <form onSubmit={handleRegister} autoComplete="off">
            <input type="text" style={{ display: 'none' }} readOnly tabIndex="-1" />
            <input type="password" style={{ display: 'none' }} readOnly tabIndex="-1" />
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Employee ID</label>
                <input type="text" className="form-control" value={form.employee_id} placeholder="e.g. EMP-0001" autoComplete="new-password" onChange={(e) => setForm({ ...form, employee_id: e.target.value })} autoFocus />
              </div>
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={form.full_name} autoComplete="new-password" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Sex</label>
                <select className="form-select" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="">Select Sex...</option>
                  <option value="Male">1. Male</option>
                  <option value="Female">2. Female</option>
                  <option value="Other">3. Other</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Position</label>
                <input type="text" className="form-control" value={form.position} autoComplete="new-password" onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Select Department...</option>
                  {departments.map((d, i) => <option key={d.id} value={d.id}>{i + 1}. {d.name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Location</label>
                <select className="form-select" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  <option value="">Select Location...</option>
                  {locations.map((loc, i) => <option key={i} value={loc.name || loc}>{i + 1}. {loc.name || loc}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-control" value={form.phone} placeholder="e.g. 012 345 678" autoComplete="new-password" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email for login to system <span className="text-danger">*</span></label>
                <input type="email" className="form-control" value={form.email} placeholder="user@example.com" autoComplete="new-password" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-md-12">
                <label className="form-label">Password <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input type={showPassword ? "text" : "password"} className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
                    <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="d-grid gap-3 mt-4">
              <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending code...</>
                  : <><i className="bi bi-envelope-check me-2"></i>Sign Up & Verify Email</>
                }
              </button>
            </div>
          </form>
          <div className="text-center mt-3 small">
            Already have an account? <Link to="/login">Log in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
