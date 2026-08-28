import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  ShieldCheck,
  Star,
  Calendar,
  Users,
  Award,
  MessageSquarePlus,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PublicProfile, Review, UserRatingSummary } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar, Badge } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { RatingStars } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const targetUserId = id || currentUser?.id;
  const isMyProfile = targetUserId === currentUser?.id;

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTripId, setReviewTripId] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [punctualityRating, setPunctualityRating] = useState<number>(5);
  const [communicationRating, setCommunicationRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTags, setReviewTags] = useState('punctual, respectful');

  // 1. Fetch Profile
  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['user-public-profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('No user specified');
      const res = await apiClient.get(`/users/${targetUserId}`);
      return res.data.data as PublicProfile;
    },
    enabled: !!targetUserId,
  });

  // 2. Fetch User Reviews & Rating Summary
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['user-reviews', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { reviews: [], summary: null };
      const res = await apiClient.get(`/reviews/user/${targetUserId}`);
      return {
        reviews: res.data.data as Review[],
        summary: res.data.summary as UserRatingSummary,
      };
    },
    enabled: !!targetUserId,
  });

  // Submit Review Mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/reviews', {
        reviewedUserId: targetUserId,
        tripId: reviewTripId.trim(),
        rating: reviewRating,
        cleanlinessRating,
        punctualityRating,
        communicationRating,
        comment: reviewComment.trim() || undefined,
        tags: reviewTags ? reviewTags.split(',').map((t) => t.trim()) : undefined,
      });
    },
    onSuccess: () => {
      success('Review Submitted', 'Thank you for contributing to our verified student reputation!');
      setIsReviewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user-reviews', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-public-profile', targetUserId] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Review Failed', err.message);
    },
  });

  if (profileLoading) return <LoadingSpinner size="lg" text="Loading student profile..." />;
  if (profileError || !profile) return <ErrorState message="Could not load user profile." />;

  const summary = reviewsData?.summary;
  const reviews = reviewsData?.reviews || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Banner Card */}
      <Card className="glass-panel border-slate-700 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar
              name={profile.fullName}
              src={profile.avatarUrl}
              size="xl"
              verified={profile.verificationStatus === 'approved'}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-white flex items-center gap-1.5">
                  {profile.fullName}
                  {profile.verificationStatus === 'approved' && (
                    <TrustBadge tier="fully_verified" iconOnly size="md" />
                  )}
                </h1>
                <TrustBadge
                  tier={profile.verificationTier || (profile.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                  size="sm"
                />
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>{profile.collegeName || 'KIET Group of Institutions'}</span>
                <span>•</span>
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Year {profile.academicYear || 1}</span>
              </p>
            </div>
          </div>

          {!isMyProfile && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MessageSquarePlus className="w-4 h-4 text-indigo-400" />}
              onClick={() => setIsReviewModalOpen(true)}
            >
              Write Review
            </Button>
          )}
        </div>

        {profile.bio && (
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            &ldquo;{profile.bio}&rdquo;
          </p>
        )}

        {/* Reputation & Milestone Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <TrustScoreMeter score={profile.trustScore || 0} size="md" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-center text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-black text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
              <span>{summary?.averageRating || profile.averageRating || '5.0'}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">
              {summary?.totalReviews || 0} Verified Reviews
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-center text-center">
            <span className="text-lg font-black text-indigo-400">{profile.completedTripCount || 0}</span>
            <span className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">Trips Completed</span>
          </div>
        </div>
      </Card>

      {/* Ratings Breakdown & Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" /> Co-Traveler Reviews & Star Breakdown
        </h3>

        {summary && summary.totalReviews > 0 && (
          <Card className="glass-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Star Distribution */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Star Rating Tallies</span>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution[String(stars) as keyof typeof summary.distribution] || 0;
                const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-12 font-semibold">{stars} Star</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Sub-Ratings */}
            <div className="space-y-3 sm:border-l sm:border-slate-800 sm:pl-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sub-Category Ratings</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Punctuality</span>
                  <span className="font-bold text-emerald-400">★ {summary.subRatings.punctuality}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Communication</span>
                  <span className="font-bold text-indigo-400">★ {summary.subRatings.communication}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cleanliness & Etiquette</span>
                  <span className="font-bold text-amber-400">★ {summary.subRatings.cleanliness}/5</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Reviews Timeline */}
        {reviewsLoading && <LoadingSpinner text="Loading reviews..." />}
        {!reviewsLoading && reviews.length === 0 && (
          <EmptyState
            icon={<Star className="w-7 h-7" />}
            title="No Reviews Yet"
            description="Verified ratings will appear here once this student completes confirmed campus travel routes."
          />
        )}

        {!reviewsLoading && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <Card key={rev.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={rev.rating} size="sm" />
                    <span className="text-xs font-bold text-slate-200">
                      {rev.reviewer?.fullName || 'Verified Co-Traveler'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {rev.comment && <p className="text-xs text-slate-300 italic">&ldquo;{rev.comment}&rdquo;</p>}

                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rev.tags.map((tag, tIdx) => (
                      <Badge key={tIdx} variant="neutral" size="sm">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review ${profile.fullName}`}
        description="Share honest feedback about your travel experience."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => submitReviewMutation.mutate()}
              isLoading={submitReviewMutation.isPending}
              disabled={!reviewTripId.trim()}
            >
              Submit Verified Review
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Confirmed Trip ID"
            placeholder="Paste ID of completed trip"
            value={reviewTripId}
            onChange={(e) => setReviewTripId(e.target.value)}
            helperText="Reviews require verified co-travel history on this trip."
            required
          />

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Overall Star Rating</span>
            <RatingStars rating={reviewRating} size="lg" interactive onChange={(r) => setReviewRating(r)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select
              label="Punctuality"
              value={punctualityRating}
              onChange={(e) => setPunctualityRating(Number(e.target.value))}
              options={[5, 4, 3, 2, 1].map((s) => ({ value: s, label: `★ ${s}` }))}
            />
            <Select
              label="Communication"
              value={communicationRating}
              onChange={(e) => setCommunicationRating(Number(e.target.value))}
              options={[5, 4, 3, 2, 1].map((s) => ({ value: s, label: `★ ${s}` }))}
            />
            <Select
              label="Cleanliness"
              value={cleanlinessRating}
              onChange={(e) => setCleanlinessRating(Number(e.target.value))}
              options={[5, 4, 3, 2, 1].map((s) => ({ value: s, label: `★ ${s}` }))}
            />
          </div>

          <Input
            label="Tags (Comma separated)"
            value={reviewTags}
            onChange={(e) => setReviewTags(e.target.value)}
            placeholder="punctual, respectful, great_music"
          />

          <Textarea
            label="Review Comment (Optional)"
            placeholder="Great ride partner, on time and friendly..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
