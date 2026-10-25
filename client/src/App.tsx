import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from './lib/api';
import { useAuth, UserRole } from './context/AuthContextCore';
import { AppShell } from './components/layout/AppShell';
import { SetupScreen } from './features/setup/SetupScreen';
import { LoginScreen } from './features/auth/LoginScreen';
import { ChangePasswordScreen } from './features/auth/ChangePasswordScreen';
import { OrgScreen } from './features/org/OrgScreen';
import { UsersScreen } from './features/users/UsersScreen';
import { EmployeesScreen } from './features/employees/EmployeesScreen';
import { MyProfileScreen } from './features/profile/MyProfileScreen';
import { AttendanceScreen } from './features/attendance/AttendanceScreen';
import { LeaveScreen } from './features/leave/LeaveScreen';
import { PayrollScreen } from './features/payroll/PayrollScreen';
import { MyPayslipsScreen } from './features/payroll/MyPayslipsScreen';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { AnnouncementsScreen } from './features/comms/AnnouncementsScreen';
import { AuditScreen } from './features/audit/AuditScreen';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles?: UserRole[];
}) {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center bg-surface rounded-card border border-border">
        <h3 className="text-lg font-bold text-danger">403 — Forbidden</h3>
        <p className="text-sm text-muted mt-2">
          You do not have administrative permissions to view this module.
        </p>
      </div>
    );
  }

  return children;
}

export function App() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    async function checkFirstRun() {
      try {
        const res = await apiFetch<{ setupComplete: boolean }>('/setup/status');
        if (!res.setupComplete && window.location.pathname !== '/setup') {
          navigate('/setup');
        }
      } catch (err) {
        console.error('Failed to query setup status:', err);
      } finally {
        setCheckingSetup(false);
      }
    }
    checkFirstRun();
  }, [navigate]);

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/setup" element={<SetupScreen />} />
      <Route path="/login" element={<LoginScreen />} />

      {/* Protected Forced Password Change */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordScreen />
          </ProtectedRoute>
        }
      />

      {/* Authenticated Application Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell user={user || undefined} onLogout={logout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route
          path="organization"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <OrgScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <EmployeesScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <MyProfileScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <ProtectedRoute>
              <AttendanceScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="leave"
          element={
            <ProtectedRoute>
              <LeaveScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <PayrollScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="payslips"
          element={
            <ProtectedRoute>
              <MyPayslipsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditScreen />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
