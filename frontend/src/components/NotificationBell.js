import { useEffect, useState, useRef } from 'react';
import api from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (_) { /* silent - notifications are non-critical */ }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s for near-real-time updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button 
        className="btn btn-transparent rounded-circle position-relative p-2 d-flex align-items-center justify-content-center text-light" 
        style={{ width: '38px', height: '38px', border: 'none' }}
        onClick={() => setOpen(!open)}
        title="Notifications"
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <i className="bi bi-bell fs-5"></i>
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65em' }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="dropdown-menu show p-0 shadow-lg border-0 rounded-3 mt-2" 
          style={{ 
            position: 'absolute',
            right: 0, 
            left: 'auto', 
            width: '350px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1050
          }}
        >
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light rounded-top-3">
            <h6 className="mb-0 fw-bold">Notifications</h6>
            <button className="btn btn-sm text-primary text-decoration-none p-0 fw-medium" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          
          <div className="list-group list-group-flush rounded-bottom-3">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-muted">
                <i className="bi bi-bell-slash fs-3 mb-2 d-block opacity-50"></i>
                <p className="mb-0 small">No notifications</p>
              </div>
            )}
            
            {notifications.slice(0, 10).map((n) => (
              <div 
                key={n.id} 
                className={`list-group-item list-group-item-action d-flex align-items-start p-3 ${!n.is_read ? 'bg-primary-subtle' : ''}`}
                style={{ cursor: 'default' }}
              >
                {!n.is_read && (
                  <span className="p-1 bg-primary rounded-circle mt-1 me-2 d-inline-block"></span>
                )}
                <div className="w-100">
                  <div className={`mb-1 ${!n.is_read ? 'fw-bold text-dark' : 'text-body'}`} style={{ fontSize: '0.85rem' }}>
                    {n.title}
                  </div>
                  <div className="text-muted d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-clock me-1"></i>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length > 10 && (
            <div className="p-2 text-center border-top bg-light rounded-bottom-3">
              <span className="text-muted small">Showing 10 most recent</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
