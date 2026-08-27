import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  DollarSign,
  MapPin,
  Calendar,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Group, Trip } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { formatIndianCurrency, cn } from '../../lib/utils';

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(4);

  // 1. Fetch all groups
  const { data: groups, isLoading, isError, refetch } = useQuery({
    queryKey: ['groups-list'],
    queryFn: async () => {
      const res = await apiClient.get('/groups');
      return res.data.data as Group[];
    },
  });

  // 2. Fetch my trips for group creation
  const { data: myTrips } = useQuery({
    queryKey: ['my-trips-for-group'],
    queryFn: async () => {
      const res = await apiClient.get('/trips');
      return res.data.data as Trip[];
    },
    enabled: isCreateOpen,
  });

  // Create Group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/groups', {
        tripId: selectedTripId,
        name: groupName.trim(),
        description: description.trim() || undefined,
        maxCapacity: Number(maxCapacity),
      });
      return res.data.data as Group;
    },
    onSuccess: (newGroup) => {
      success('Group Created', `Group "${newGroup.name}" is now accepting campus travelers.`);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      navigate(`/groups/${newGroup.id}`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to create group', err.message);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" /> Group Travel & Cost Splitting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Form travel groups, reserve seats with atomic capacity guards, and split fuel/cab costs automatically.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Travel Group
        </Button>
      </div>

      {isLoading && <LoadingSpinner text="Loading campus groups..." />}
      {isError && <ErrorState message="Could not fetch groups." onRetry={() => refetch()} />}

      {!isLoading && !isError && (!groups || groups.length === 0) && (
        <EmptyState
          icon={<Car className="w-7 h-7" />}
          title="No Travel Groups Created Yet"
          description="Create the first campus travel group to coordinate multi-passenger rides and split expenses."
          actionLabel="Create a Group"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Groups Grid */}
      {!isLoading && !isError && groups && groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const fillPercentage = Math.min(100, Math.round((group.currentMemberCount / group.maxCapacity) * 100));
            const isFull = group.currentMemberCount >= group.maxCapacity;

            return (
              <Card key={group.id} hoverEffect className="glass-card flex flex-col justify-between p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-100 truncate">{group.name}</h3>
                    <Badge variant={isFull ? 'danger' : 'success'} size="sm">
                      {isFull ? 'Full' : 'Seats Available'}
                    </Badge>
                  </div>

                  {group.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{group.description}</p>
                  )}

                  {/* Seat Capacity Progress */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                      <span>Capacity</span>
                      <span>
                        {group.currentMemberCount} / {group.maxCapacity} Members
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isFull ? 'bg-rose-500' : 'bg-indigo-500'
                        )}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Cost Split summary */}
                  {group.costSplit && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Share / Person
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatIndianCurrency(group.costSplit.costPerMember)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                  <Link to={`/groups/${group.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs text-indigo-400">
                      View Group Roster →
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Form a Travel Group"
        description="Link to one of your scheduled trips to coordinate multi-student rides."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => createGroupMutation.mutate()}
              isLoading={createGroupMutation.isPending}
              disabled={!selectedTripId || !groupName.trim()}
            >
              Create Group
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Select
            label="Associated Trip"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            options={
              myTrips?.map((t) => ({
                value: t.id,
                label: `${t.source.name} → ${t.destination.name} (${t.travelDate})`,
              })) || []
            }
            placeholder="Select a scheduled trip"
            required
          />

          <Input
            label="Group Name"
            placeholder="E.g. KIET Morning Cab Pool"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />

          <Input
            label="Max Passenger Capacity"
            type="number"
            min={2}
            max={8}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(Number(e.target.value))}
            required
          />

          <Textarea
            label="Group Description / Rules"
            placeholder="E.g. Splitting Uber XL fare equally. Leaving campus on time."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
};
