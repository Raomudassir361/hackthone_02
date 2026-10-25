import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { useToast } from '../../components/ui/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Megaphone, Plus, Calendar, User } from 'lucide-react';

interface AnnouncementItem {
  id?: string;
  _id: string;
  title: string;
  body: string;
  postedBy: {
    _id: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

export function AnnouncementsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isHrOrAdmin = user?.role === 'admin' || user?.role === 'hr';

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      return apiFetch<AnnouncementItem[]>('/announcements');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, body }),
      });
    },
    onSuccess: () => {
      showToast('Announcement posted successfully.', 'success');
      setShowModal(false);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not create announcement.';
      showToast(msg, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Please provide both title and announcement body.', 'info');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Company Announcements</h1>
          <p className="text-sm text-muted mt-1">
            Stay informed with company-wide notices, policy updates, and executive memos.
          </p>
        </div>

        {isHrOrAdmin && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface rounded-card border border-border animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-6 h-6 text-muted" />}
          title="No announcements yet"
          description="There are currently no company announcements posted."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item._id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-text">{item.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {item.postedBy?.email} ({item.postedBy?.role.toUpperCase()})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted" />
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-text/90 mt-3 whitespace-pre-wrap leading-relaxed">
                {item.body}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Broadcast Announcement"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Announcement Title" required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Eid-ul-Fitr Office Closure Schedule"
                className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </FormField>

            <FormField label="Body Message" required>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Full announcement text..."
                className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
                Publish Announcement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
