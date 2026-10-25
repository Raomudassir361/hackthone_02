import { useState } from 'react';
import { useAuth } from '../../context/AuthContextCore';
import { MyLeaveScreen } from './MyLeaveScreen';
import { LeaveInboxTab } from './LeaveInboxTab';
import { Calendar, Inbox } from 'lucide-react';

export function LeaveScreen() {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'admin' || user?.role === 'hr';

  const [activeTab, setActiveTab] = useState<'my' | 'inbox'>(
    isHrOrAdmin && !user?.employeeId ? 'inbox' : 'my'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Leave Management</h1>
          <p className="text-sm text-muted mt-1">
            Apply for leave, track remaining balances, and review pending departmental requests.
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex bg-surface p-1 rounded-lg border border-border self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Calendar className="w-4 h-4" />
              My Leaves & Apply
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'inbox'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Approval Inbox
            </button>
          </div>
        )}
      </div>

      {/* Body View */}
      {(!isHrOrAdmin || activeTab === 'my') ? (
        <MyLeaveScreen />
      ) : (
        <LeaveInboxTab />
      )}
    </div>
  );
}
