import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Check,
  X,
  MessageSquare,
  MapPin,
  Clock,
  ShieldCheck,
  UserCheck,
  Send,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Connection } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar, Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const ConnectionsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'incoming' | 'accepted' | 'outgoing'>('incoming');

  // 1. Fetch incoming requests
  const {
    data: incoming,
    isLoading: incomingLoading,
    isError: incomingError,
  } = useQuery({
    queryKey: ['incoming-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/connections/requests');
      return res.data.data as Connection[];
    },
  });

  // 2. Fetch all connections
  const {
    data: allConnections,
    isLoading: allLoading,
    isError: allError,
  } = useQuery({
    queryKey: ['all-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/connections');
      return res.data.data as Connection[];
    },
  });

  const accepted = allConnections?.filter((c) => c.status === 'accepted') || [];
  const outgoing = allConnections?.filter((c) => c.status === 'pending' && c.requesterId === user?.id) || [];

  // Update connection status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: 'accepted' | 'declined' }) => {
      await apiClient.patch(`/connections/${connectionId}`, { status });
    },
    onSuccess: (_, variables) => {
      success(
        variables.status === 'accepted' ? 'Connection Accepted' : 'Connection Declined',
        variables.status === 'accepted' ? 'You are now travel companions!' : 'Request has been declined.'
      );
      queryClient.invalidateQueries({ queryKey: ['incoming-connections'] });
      queryClient.invalidateQueries({ queryKey: ['all-connections'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to update connection', err.message);
    },
  });

  // Start conversation mutation
  const startChatMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await apiClient.post('/messaging/conversations', { recipientId });
      return res.data.data.id;
    },
    onSuccess: (conversationId) => {
      navigate(`/messages/${conversationId}`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Could not open chat', err.message);
    },
  });

  const tabs = [
    { id: 'incoming', label: 'Incoming Requests', count: incoming?.length || 0 },
    { id: 'accepted', label: 'Travel Buddies', count: accepted.length },
    { id: 'outgoing', label: 'Sent Requests', count: outgoing.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-indigo-400" /> Travel Companions & Requests
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Coordinate with verified students, confirm shared rides, and chat securely.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id: string) => setActiveTab(id as 'incoming' | 'accepted' | 'outgoing')} />

      {/* Tab 1: Incoming */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {incomingLoading && <LoadingSpinner text="Loading requests..." />}
          {incomingError && <ErrorState message="Failed to load incoming requests." />}

          {!incomingLoading && (!incoming || incoming.length === 0) && (
            <EmptyState
              icon={<Users className="w-7 h-7" />}
              title="No Pending Incoming Requests"
              description="When other students find your trip compatible and send a connection request, they will appear here."
            />
          )}

          {incoming && incoming.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incoming.map((conn) => {
                const requester = conn.requester;
                return (
                  <Card key={conn.id} className="glass-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={requester?.fullName}
                          src={requester?.avatarUrl}
                          verified={requester?.verificationStatus === 'approved'}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            {requester?.fullName || 'Student'}
                            {requester?.verificationStatus === 'approved' && (
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            )}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {requester?.collegeName || 'KIET'} • Year {requester?.academicYear || 1}
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">
                        Pending
                      </Badge>
                    </div>

                    {conn.message && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 italic">
                        &ldquo;{conn.message}&rdquo;
                      </div>
                    )}

                    <div className="pt-2">
                      <TrustScoreMeter score={requester?.trustScore || 0} size="sm" />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<X className="w-3.5 h-3.5 text-rose-400" />}
                        onClick={() => updateStatusMutation.mutate({ connectionId: conn.id, status: 'declined' })}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => updateStatusMutation.mutate({ connectionId: conn.id, status: 'accepted' })}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Accept Request
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Accepted Travel Buddies */}
      {activeTab === 'accepted' && (
        <div className="space-y-4">
          {allLoading && <LoadingSpinner text="Loading travel buddies..." />}
          {allError && <ErrorState message="Failed to load connections." />}

          {!allLoading && accepted.length === 0 && (
            <EmptyState
              icon={<UserCheck className="w-7 h-7" />}
              title="No Confirmed Travel Companions Yet"
              description="Accept incoming requests or explore matching campus trips to build your verified buddy network."
              actionLabel="Discover Matches"
              onAction={() => navigate('/matches')}
            />
          )}

          {accepted.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accepted.map((conn) => {
                const companion = conn.requesterId === user?.id ? conn.recipient : conn.requester;
                const companionId = conn.requesterId === user?.id ? conn.recipientId : conn.requesterId;

                return (
                  <Card key={conn.id} hoverEffect className="glass-card p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={companion?.fullName}
                          src={companion?.avatarUrl}
                          verified={companion?.verificationStatus === 'approved'}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                            {companion?.fullName || 'Travel Companion'}
                          </h4>
                          <p className="text-xs text-slate-400">{companion?.collegeName || 'KIET'}</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <TrustScoreMeter score={companion?.trustScore || 0} size="sm" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <Link to={`/profile/${companionId}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          Profile
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                        onClick={() => startChatMutation.mutate(companionId)}
                        isLoading={startChatMutation.isPending}
                      >
                        Message
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Outgoing Requests */}
      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          {!allLoading && outgoing.length === 0 && (
            <EmptyState
              icon={<Send className="w-7 h-7" />}
              title="No Pending Outgoing Requests"
              description="Requests you send to other student commuters will be listed here."
            />
          )}

          {outgoing.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outgoing.map((conn) => {
                const recipient = conn.recipient;
                return (
                  <Card key={conn.id} className="glass-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={recipient?.fullName} src={recipient?.avatarUrl} />
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{recipient?.fullName || 'Student'}</h4>
                          <p className="text-xs text-slate-400">{recipient?.collegeName || 'KIET'}</p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">
                        Waiting Confirmation
                      </Badge>
                    </div>

                    {conn.message && (
                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        &ldquo;{conn.message}&rdquo;
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
