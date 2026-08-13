import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';
import { useState, useEffect, useCallback } from 'react';

function menuFor(role) {
  if (role !== 'Admin') {
    // Normal user — Dashboard + My Tickets only
    return [
      { to: '/dashboard', icon: 'bi-speedometer2', label: 'dashboard' },
      { to: '/tickets', icon: 'bi-ticket-detailed', label: 'all_tickets' }
    ];
  }
  // Admin — full menu
  return [
    { to: '/dashboard', icon: 'bi-speedometer2', label: 'dashboard' },
    { to: '/tickets', icon: 'bi-ticket-detailed', label: 'all_tickets' },
    { to: '/admin/users', icon: 'bi-people', label: 'users' },
    { to: '/admin/locations', icon: 'bi-geo-alt', label: 'Locations & Depts' },
    { to: '/admin/statuses', icon: 'bi-tags', label: 'Ticket Statuses' },
    { to: '/admin/settings', icon: 'bi-gear', label: 'settings' },
    { to: '/admin/logs', icon: 'bi-clock-history', label: 'audit_logs' }
  ];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      let newWidth = e.clientX;
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 500) newWidth = 500;
      setSidebarWidth(newWidth);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const crumbs = location.pathname.split('/').filter(Boolean);

  if (user?.role !== 'Admin') {
    return (
      <div className="d-flex vh-100 overflow-hidden">
        {isSidebarOpen && (
          <aside 
            className={`app-sidebar p-3 d-none d-md-flex flex-column position-relative bg-dark-blue ${isDragging ? 'dragging' : ''}`}
            style={{ width: sidebarWidth, color: '#fff' }}
          >
            <div 
              className={`sidebar-resizer ${isDragging ? 'active' : ''}`}
              onMouseDown={handleMouseDown}
              onDoubleClick={() => setSidebarWidth(220)}
              title="Close Ctrl + \
Resize Drag
Reset Double-click"
            ></div>
            <div className="mb-4 d-flex flex-column align-items-center text-center">
              <img src="/logo1.jpg" alt="Logo"
                style={{ height: '80px', objectFit: 'contain', width: '100%', maxWidth: '180px', backgroundColor: '#fff', padding: '5px', borderRadius: '5px' }}
                className="mb-2 mt-2"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h5 className="mb-0 fw-bold text-white" style={{ fontSize: '0.95rem' }}>{t('app_name') || 'Request Tickets System'}</h5>
            </div>
            <nav className="nav flex-column flex-grow-1">
              <NavLink to="/dashboard" className="nav-link px-3 py-2">
                <i className="bi bi-speedometer2 me-2"></i>{t('dashboard') || 'Dashboard'}
              </NavLink>
              <NavLink to="/tickets" className="nav-link px-3 py-2">
                <i className="bi bi-ticket-detailed me-2"></i>{t('all_tickets') || 'My Tickets'}
              </NavLink>
              <NavLink to="/tickets/new" className="nav-link px-3 py-2">
                <i className="bi bi-plus-circle me-2"></i>{t('new_ticket') || 'Request Tickets'}
              </NavLink>
            </nav>
          </aside>
        )}
        <div className="main-content d-flex flex-column h-100">
          <header className="navbar navbar-expand shadow-sm px-3 d-print-none bg-dark-blue" style={{ zIndex: 10 }}>
            <div className="me-auto">
              {!isSidebarOpen && (
                <button className="btn btn-sm btn-outline-light" onClick={() => setIsSidebarOpen(true)} title="Open Sidebar (Ctrl + \)">
                  <i className="bi bi-layout-sidebar"></i>
                </button>
              )}
            </div>
            <div className="d-flex align-items-center gap-3">
              <select 
                className="form-select form-select-sm border-0 bg-transparent text-white shadow-none fw-bold" 
                style={{ width: '80px', cursor: 'pointer' }} 
                value={lang}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en" className="text-dark">EN</option>
                <option value="km" className="text-dark">ខ្មែរ</option>
              </select>

              <button 
                className="btn btn-outline-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0" 
                style={{ width: '38px', height: '38px' }}
                onClick={toggleTheme} 
                title="Toggle theme"
              >
                <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'} fs-5`}></i>
              </button>

              <NotificationBell />

              <div className="d-none d-md-flex align-items-center ms-2 border-start border-secondary ps-3 h-100 py-1">
                <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold shadow-sm" style={{ width: '36px', height: '36px', fontSize: '15px' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="lh-sm me-3">
                  <div className="fw-bold text-white" style={{ fontSize: '0.9rem', letterSpacing: '0.3px' }}>{user?.name || 'User'}</div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>{user?.role || 'System User'}</div>
                </div>
              </div>

              <button 
                className="btn btn-danger rounded-pill px-3 py-2 d-flex align-items-center fw-medium shadow-sm" 
                onClick={() => { logout(); navigate('/login'); }}
              >
                <i className="bi bi-box-arrow-right me-2"></i>{t('logout')}
              </button>
            </div>
          </header>
          <main className="p-4 flex-grow-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex vh-100 overflow-hidden">
      {isSidebarOpen && (
        <aside 
          className={`app-sidebar p-3 d-none d-md-flex flex-column position-relative bg-dark-blue ${isDragging ? 'dragging' : ''}`}
          style={{ width: sidebarWidth, color: '#fff' }}
        >
          <div 
            className={`sidebar-resizer ${isDragging ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setSidebarWidth(240)}
            title="Close Ctrl + \
Resize Drag
Reset Double-click"
          ></div>
          <div className="mb-4 d-flex flex-column align-items-center text-center">
            <img 
              src="/logo1.jpg" 
              alt="Logo" 
              style={{ height: '90px', objectFit: 'contain', width: '100%', maxWidth: '200px', backgroundColor: '#fff', padding: '5px', borderRadius: '5px' }} 
              className="mb-3 mt-2"
              onError={(e) => {
                e.target.style.display = 'none';
                document.getElementById('sidebar-fallback-icon').style.display = 'block';
              }}
            />
            <i id="sidebar-fallback-icon" className="bi bi-headset text-warning mb-2" style={{ fontSize: '2rem', display: 'none' }}></i>
            <h5 className="mb-0 fw-bold text-white" style={{ fontSize: '1rem', fontFamily: '"Khmer OS Siemreap", sans-serif' }}>{t('app_name') || 'Request Tickets System'}</h5>
          </div>
          <nav className="nav flex-column flex-grow-1">
            {menuFor(user?.role).map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link px-3 py-2">
                <i className={`bi ${item.icon} me-2`}></i>{t(item.label) || item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <div className="main-content d-flex flex-column h-100">
        <header className="navbar navbar-expand shadow-sm px-3 d-print-none bg-dark-blue" style={{ zIndex: 10 }}>
          <div className="me-auto">
            {!isSidebarOpen && (
              <button className="btn btn-sm btn-outline-light" onClick={() => setIsSidebarOpen(true)} title="Open Sidebar (Ctrl + \)">
                <i className="bi bi-layout-sidebar"></i>
              </button>
            )}
          </div>
          <div className="d-flex align-items-center gap-3">
            <select 
              className="form-select form-select-sm border-0 bg-transparent text-white shadow-none fw-bold" 
              style={{ width: '80px', cursor: 'pointer' }} 
              value={lang}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en" className="text-dark">EN</option>
              <option value="km" className="text-dark">ខ្មែរ</option>
            </select>

            <button 
              className="btn btn-outline-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0" 
              style={{ width: '38px', height: '38px' }}
              onClick={toggleTheme} 
              title="Toggle theme"
            >
              <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'} fs-5`}></i>
            </button>

            <NotificationBell />

            <div className="d-none d-md-flex align-items-center ms-2 border-start border-secondary ps-3 h-100 py-1">
              <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold shadow-sm" style={{ width: '36px', height: '36px', fontSize: '15px' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="lh-sm me-3">
                <div className="fw-bold text-white" style={{ fontSize: '0.9rem', letterSpacing: '0.3px' }}>{user?.name || 'Admin'}</div>
                <div className="text-white-50" style={{ fontSize: '0.75rem' }}>{user?.role || 'Administrator'}</div>
              </div>
            </div>

            <button 
              className="btn btn-danger rounded-pill px-3 py-2 d-flex align-items-center fw-medium shadow-sm" 
              onClick={() => { logout(); navigate('/login'); }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>{t('logout')}
            </button>
          </div>
        </header>
        <main className="p-4 flex-grow-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
