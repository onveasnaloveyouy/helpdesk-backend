import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SystemSettings() {
  const [saved, setSaved] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [emailConfig, setEmailConfig] = useState(() => {
    const stored = localStorage.getItem('emailjs_config');
    return stored ? JSON.parse(stored) : {
      sender_email: '',
      app_password: '',
      service_id: '',
      template_id_otp: '',
      template_id_reset: '',
      public_key: '',
      from_name: 'IT Ticket System',
      receive_notifications: true
    };
  });

  const isConfigured = !!(emailConfig.sender_email && emailConfig.app_password);

  function saveEmailConfig(e) {
    e.preventDefault();
    localStorage.setItem('emailjs_config', JSON.stringify(emailConfig));
    setSaved('✅ Email settings saved successfully!');
    setTestResult(null);
    setTimeout(() => setSaved(''), 4000);
  }

  async function sendTestEmail() {
    setTesting(true);
    setTestResult(null);
    const config = JSON.parse(localStorage.getItem('emailjs_config') || '{}');
    if (!config.sender_email || !config.app_password) {
      setTestResult({ ok: false, msg: 'Please fill in your Gmail address and App Password first.' });
      setTesting(false);
      return;
    }
    try {
      const response = await api.post('/email/test', {
        to_email: 'test@example.com',
        config
      });
      const data = response.data;
      if (response.status === 200) {
        setTestResult({ ok: true, msg: `✅ Test email sent to ${config.sender_email}! Please check your inbox.` });
      } else {
        setTestResult({ ok: false, msg: `❌ Failed: ${data.error}` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: '❌ Email server not running. Please start it first (see instructions below).' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <h4 className="mb-4">System Settings</h4>

      {/* Email Settings Card */}
      <div className="card shadow-sm mb-4">
        <div className="card-header d-flex align-items-center justify-content-between py-3">
          <div className="d-flex align-items-center">
            <i className="bi bi-envelope-fill text-primary me-2 fs-5"></i>
            <strong>Email Settings for Sending Verification Code</strong>
          </div>
          <span className={`badge rounded-pill ${isConfigured ? 'bg-success' : 'bg-warning text-dark'}`}>
            {isConfigured ? '● Connected' : '● Not Configured'}
          </span>
        </div>
        <div className="card-body">

          {saved && <div className="alert alert-success py-2 mb-3">{saved}</div>}
          {testResult && (
            <div className={`alert py-2 mb-3 ${testResult.ok ? 'alert-success' : 'alert-danger'}`}>{testResult.msg}</div>
          )}

          <form onSubmit={saveEmailConfig}>

            {/* Primary Fields — Gmail + App Password */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <i className="bi bi-google me-1 text-danger"></i>
                  Your Gmail Address <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="yourname@gmail.com"
                  value={emailConfig.sender_email}
                  onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
                  required
                />
                <div className="form-text">This is the email that will send verification codes to users.</div>
                <div className="form-check mt-2">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="receive_notifications"
                    checked={emailConfig.receive_notifications ?? true}
                    onChange={(e) => setEmailConfig({ ...emailConfig, receive_notifications: e.target.checked })}
                  />
                  <label className="form-check-label text-muted small" htmlFor="receive_notifications">
                    Also send new ticket notifications to this email
                  </label>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <i className="bi bi-key-fill me-1 text-warning"></i>
                  Gmail App Password <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={emailConfig.app_password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, app_password: e.target.value })}
                    required
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                  </button>
                </div>
                <div className="form-text">
                  Not your Gmail login password.{' '}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                    Get App Password here →
                  </a>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Sender Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="IT Ticket System"
                  value={emailConfig.from_name}
                  onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                />
              </div>
            </div>

            {/* How to get App Password guide */}
            <div className="alert alert-light border mb-3 py-3 small">
              <p className="fw-semibold mb-2"><i className="bi bi-question-circle text-primary me-1"></i>How to get a Gmail App Password:</p>
              <ol className="mb-0 ps-3">
                <li>Go to your <a href="https://myaccount.google.com" target="_blank" rel="noreferrer">Google Account</a></li>
                <li>Click <strong>Security</strong> → Enable <strong>2-Step Verification</strong> (if not already)</li>
                <li>Search for <strong>"App Passwords"</strong> in the search bar</li>
                <li>Select App: <strong>Mail</strong> → Device: <strong>Other</strong> → type "IT System" → click <strong>Generate</strong></li>
                <li>Copy the 16-character password and paste it above</li>
              </ol>
            </div>


            {/* Action Buttons */}
            <div className="d-flex gap-2 flex-wrap">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-save me-1"></i>Save Settings
              </button>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={sendTestEmail}
                disabled={testing}
              >
                {testing
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Sending test...</>
                  : <><i className="bi bi-send me-1"></i>Send Test Email</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SLA Settings */}
      <div className="card shadow-sm" style={{ maxWidth: 500 }}>
        <div className="card-header d-flex align-items-center py-3">
          <i className="bi bi-clock-fill text-warning me-2"></i>
          <strong>SLA Resolution Times (minutes)</strong>
        </div>
        <ul className="list-group list-group-flush">
          {[
            { priority: 'Low', minutes: 480 },
            { priority: 'Medium', minutes: 240 },
            { priority: 'High', minutes: 60 },
            { priority: 'Critical', minutes: 30 }
          ].map((s) => (
            <li key={s.priority} className="list-group-item d-flex justify-content-between align-items-center">
              <span className="fw-semibold">{s.priority}</span>
              <input type="number" className="form-control form-control-sm" style={{ width: 120 }} defaultValue={s.minutes} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
