import { useAuth } from '../../context/AuthContextCore';
import { AdminDashboardView } from './AdminDashboardView';
import { HrDashboardView } from './HrDashboardView';
import { EmployeeDashboardView } from './EmployeeDashboardView';

export function DashboardScreen() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Welcome back, {user?.name || user?.email}
          </h1>
          <p className="text-sm text-muted mt-1">
            System Workspace · Role:{' '}
            <span className="font-semibold uppercase tracking-wider text-primary">
              {user?.role}
            </span>
          </p>
        </div>
      </div>

      {/* Role-Specific Dashboard Renderer */}
      {user?.role === 'admin' && <AdminDashboardView />}
      {user?.role === 'hr' && <HrDashboardView />}
      {user?.role === 'employee' && <EmployeeDashboardView />}
    </div>
  );
}
