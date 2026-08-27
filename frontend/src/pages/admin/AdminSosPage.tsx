import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Radio,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminSosPage: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'resolved' | 'false_alarm'>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // 1. Fetch SOS Events
  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-sos-events-list'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/sos-events');
      return res.data.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for safety triage
  });

  // 2. Resolve SOS Event Mutation
  const resolveSosMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return;
      await apiClient.patch(`/admin/sos-events/${selectedEvent.id}/resolve`, {
        status: resolveStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      success('SOS Event Resolved', 'Incident marked as complete and logged in safety history.');
      setSelectedEvent(null);
      setResolutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-sos-events-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to resolve SOS', err.message);
    },
  });

  const list = events || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" /> Live Emergency SOS Monitor
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          High-priority emergency feed with realtime GPS coordinates and emergency contact dispatch logs.
        </p>
      </div>

      {isLoading && <LoadingSpinner text="Connecting to safety radar..." />}
      {isError && <ErrorState message="Could not fetch SOS feed." onRetry={() => refetch()} />}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 className="w-7 h-7" />}
          title="All Clear — No Active SOS Events"
          description="Campus traveler network is safe and secure. Active triggers will appear here instantaneously."
        />
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="space-y-4">
          {list.map((evt: any) => {
            const isActive = evt.status === 'active';
            return (
              <Card
                key={evt.id}
                className={
                  isActive
                    ? 'p-5 rounded-2xl bg-rose-950/40 border-2 border-rose-500 shadow-glow-sos space-y-4'
                    : 'glass-card p-5 space-y-4 opacity-75'
                }
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={evt.user?.fullName} src={evt.user?.avatarUrl} size="md" />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {evt.user?.fullName || 'Student in Need'}
                        {isActive && <Radio className="w-4 h-4 text-rose-400 animate-ping" />}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {evt.user?.collegeName || 'KIET'} • Phone: {evt.user?.phone || 'On file'}
                      </p>
                    </div>
                  </div>

                  <Badge variant={isActive ? 'danger' : 'success'} size="md" className="uppercase font-bold">
                    {evt.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Location coordinates */}
                {evt.location && evt.location.coordinates && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span>
                        GPS: {evt.location.coordinates[1].toFixed(5)}, {evt.location.coordinates[0].toFixed(5)}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${evt.location.coordinates[1]},${evt.location.coordinates[0]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Open in Maps →
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Triggered: {new Date(evt.createdAt).toLocaleString()}
                  </span>

                  {isActive && (
                    <Button
                      size="sm"
                      variant="sos"
                      onClick={() => setSelectedEvent(evt)}
                    >
                      Resolve Incident
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve SOS Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Resolve Emergency Incident"
        description="Verify safety status of student before closing alert."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => resolveSosMutation.mutate()}
              isLoading={resolveSosMutation.isPending}
            >
              Close SOS Alert
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Resolution Category</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={resolveStatus === 'resolved' ? 'primary' : 'outline'}
                onClick={() => setResolveStatus('resolved')}
                className="w-full text-xs"
              >
                Safe / Handled
              </Button>
              <Button
                type="button"
                variant={resolveStatus === 'false_alarm' ? 'primary' : 'outline'}
                onClick={() => setResolveStatus('false_alarm')}
                className="w-full text-xs"
              >
                Accidental / False Alarm
              </Button>
            </div>
          </div>

          <Textarea
            label="Incident Action Notes"
            placeholder="E.g. Student contacted via security, confirmed reached hostel safely."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            required
          />
        </div>
      </Modal>
    </div>
  );
};
