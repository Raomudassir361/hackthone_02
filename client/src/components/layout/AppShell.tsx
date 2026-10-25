import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Building2,
  UserCog,
  Bell,
  Sparkles,
  LogOut,
  Menu,
  X,
  ScrollText,
} from 'lucide-react';
import { AiChatSlideOver } from '../../features/ai/AiChatSlideOver';

export type UserRole = 'admin' | 'hr' | 'employee';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  employeeId?: string;
}

export interface AppShellProps {
  user?: AppUser;
  onLogout?: () => void;
  children?: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ['admin', 'hr', 'employee'],
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: <Users className="w-4 h-4" />,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <CalendarCheck className="w-4 h-4" />,
    roles: ['admin', 'hr', 'employee'],
  },
  {
    label: 'Leave',
    path: '/leave',
    icon: <CalendarDays className="w-4 h-4" />,
    roles: ['hr', 'employee'],
  },
  {
    label: 'Payroll',
    path: '/payroll',
    icon: <CreditCard className="w-4 h-4" />,
    roles: ['admin', 'hr'],
  },
  {
    label: 'My Payslips',
    path: '/payslips',
    icon: <FileText className="w-4 h-4" />,
    roles: ['employee', 'hr'],
  },
  {
    label: 'Organization',
    path: '/organization',
    icon: <Building2 className="w-4 h-4" />,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Users & Logins',
    path: '/users',
    icon: <UserCog className="w-4 h-4" />,
    roles: ['admin'],
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: <Users className="w-4 h-4" />,
    roles: ['employee', 'hr'],
  },
  {
    label: 'Audit Log',
    path: '/audit',
    icon: <ScrollText className="w-4 h-4" />,
    roles: ['admin'],
  },
];

export function AppShell({ user, onLogout, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const navigate = useNavigate();

  // Filter navigation items by user role (default to employee view if none)
  const currentRole: UserRole = user?.role || 'admin';
  const visibleNav = navItems.filter((item) => item.roles.includes(currentRole));

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('hcm_token');
      localStorage.removeItem('hcm_user');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop Sidebar (Fixed 240px, Navy) */}
      <aside className="hidden lg:flex w-60 flex-col bg-[#1F2A44] text-white shrink-0 fixed inset-y-0 z-30 shadow-lg">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-white/10 gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-base">
            H
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">HCM Lite</div>
            <div className="text-[10px] text-teal-300 font-medium tracking-wider uppercase">
              AI HR System
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-control text-xs font-semibold tracking-wide transition-all',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-white/10 bg-black/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-teal-300 uppercase">
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.name || user?.email || 'User'}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {currentRole}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-[#1F2A44] text-white flex flex-col z-10 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <div className="font-bold text-sm">HCM Lite</div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-control text-xs font-semibold tracking-wide transition-all',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 rounded-control transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-control text-navy hover:bg-bg"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-navy tracking-tight">
              HCM Lite
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant button */}
            <button
              onClick={() => setAiChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all shadow-sm"
              title="Open AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Ask AI</span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/announcements')}
              className="p-2 rounded-control text-muted hover:text-navy hover:bg-bg relative transition-colors"
              title="Announcements & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-warn absolute top-2 right-2 ring-2 ring-surface" />
            </button>
          </div>
        </header>

        {/* AI Assistant SlideOver Drawer */}
        <AiChatSlideOver
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          userRole={user?.role}
        />

        {/* Page Container */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
