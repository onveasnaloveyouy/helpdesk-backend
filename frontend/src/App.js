import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Faq from './pages/Faq';
import Reports from './pages/Reports';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDepartments from './pages/admin/ManageDepartments';
import ManageCategories from './pages/admin/ManageCategories';
import ManageStatuses from './pages/admin/ManageStatuses';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';

import ManageLocations from './pages/admin/ManageLocations';

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/tickets" replace />;
  return children;
}

function IndexRedirect() {
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Public Request Form */}
        <Route path="/tickets/new" element={
          <div className="container py-5 d-flex flex-column align-items-center bg-body-tertiary min-vh-100">
            <CreateTicket />
          </div>
        } />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={<ProtectedRoute roles={['Admin', 'User', 'Employee', 'Technician']}><Dashboard /></ProtectedRoute>} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="faq" element={<Faq />} />
          <Route path="reports" element={<ProtectedRoute roles={['Admin']}><Reports /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute roles={['Admin']}><ManageUsers /></ProtectedRoute>} />
          <Route path="admin/departments" element={<Navigate to="/admin/locations" replace />} />
          <Route path="admin/categories" element={<ProtectedRoute roles={['Admin']}><ManageCategories /></ProtectedRoute>} />
          <Route path="admin/statuses" element={<ProtectedRoute roles={['Admin']}><ManageStatuses /></ProtectedRoute>} />
          <Route path="admin/locations" element={<ProtectedRoute roles={['Admin']}><ManageLocations /></ProtectedRoute>} />
          <Route path="admin/settings" element={<ProtectedRoute roles={['Admin']}><SystemSettings /></ProtectedRoute>} />
          <Route path="admin/logs" element={<ProtectedRoute roles={['Admin']}><AuditLogs /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
