import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Users, Search, Shield, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminGroupItem, PaginatedResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminGroupsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<AdminGroupItem>>({
    queryKey: ['admin-groups-list', page, searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/admin/groups', {
        params: {
          page,
          pageSize: 15,
          search: searchQuery.trim().length > 0 ? searchQuery : undefined,
        },
      });
      return res.data;
    },
  });

  const groups = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-400" /> Commute Circles & Travel Groups
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Directory and moderation oversight for campus travel circles, hostel groups, and daily route communities.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-teal-950/60 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-300">
          <Users className="w-4 h-4 text-teal-400" /> {pagination.totalCount} Active Circles
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search commute circles by title or route description..."
          className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Groups List */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" text="Loading commute circles..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Circle Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Student Members</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No commute circles found.
                    </td>
                  </tr>
                ) : (
                  groups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-400 shrink-0" />
                          <span>{g.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {g.description || 'Campus commuting group'}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="brand" className="text-[11px] font-mono">
                          {g.memberCount} members
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(g.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="success" className="text-[10px]">
                          🟢 Active
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} circles)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
