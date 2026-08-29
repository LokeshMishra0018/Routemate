import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Star,
  Award,
  MessageSquarePlus,
  Building,
  GraduationCap,
  Edit3,
  BookOpen,
  Hash,
  BadgePercent,
  Phone,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PublicProfile, Review, UserRatingSummary } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar, Badge } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { Card } from '../../components/ui/Card';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { RatingStars } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

const CAMPUS_BRANCHES = [
  { value: 'Computer Science & Engineering (CSE)', label: 'Computer Science & Engineering (CSE)' },
  { value: 'Information Technology (IT)', label: 'Information Technology (IT)' },
  { value: 'Computer Science & AI / ML (CS-AIML)', label: 'Computer Science & AI / ML (CS-AIML)' },
  { value: 'Computer Science & Data Science (CS-DS)', label: 'Computer Science & Data Science (CS-DS)' },
  { value: 'Electronics & Communication (ECE)', label: 'Electronics & Communication (ECE)' },
  { value: 'Electrical & Electronics Engineering (EEE)', label: 'Electrical & Electronics Engineering (EEE)' },
  { value: 'Mechanical Engineering (ME)', label: 'Mechanical Engineering (ME)' },
  { value: 'Civil Engineering (CE)', label: 'Civil Engineering (CE)' },
  { value: 'Master of Computer Applications (MCA)', label: 'Master of Computer Applications (MCA)' },
  { value: 'Master of Business Administration (MBA)', label: 'Master of Business Administration (MBA)' },
  { value: 'Pharmacy (B.Pharm / M.Pharm)', label: 'Pharmacy (B.Pharm / M.Pharm)' },
  { value: 'Other Department', label: 'Other Department' },
];

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user: currentUser, updateProfileState } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const targetUserId = id || currentUser?.id;
  const isMyProfile = targetUserId === currentUser?.id;

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTripId, setReviewTripId] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [punctualityRating, setPunctualityRating] = useState<number>(5);
  const [communicationRating, setCommunicationRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTags, setReviewTags] = useState('punctual, respectful');

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBranch, setEditBranch] = useState('Computer Science & Engineering (CSE)');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState<number>(3);
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editBio, setEditBio] = useState('');

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

  // Sync edit form with profile data
  useEffect(() => {
    if (profile && isMyProfile) {
      setEditFullName(profile.fullName || '');
      setEditBranch(profile.branch || 'Computer Science & Engineering (CSE)');
      setEditRollNumber(profile.rollNumber || '');
      setEditStudentId(profile.studentId || '');
      setEditAcademicYear(profile.academicYear || 3);
      setEditGender((profile.gender as 'male' | 'female') || 'male');
      setEditPhoneNumber(profile.phoneNumber || '');
      setEditBio(profile.bio || '');
    }
  }, [profile, isMyProfile]);

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

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/users/me/profile', {
        fullName: editFullName.trim(),
        branch: editBranch.trim() || undefined,
        rollNumber: editRollNumber.trim() || undefined,
        studentId: editStudentId.trim() || undefined,
        academicYear: Number(editAcademicYear),
        gender: editGender,
        phoneNumber: editPhoneNumber.trim() || undefined,
        bio: editBio.trim() || undefined,
      });
      return res.data.data;
    },
    onSuccess: (updatedData) => {
      success('Profile Updated', 'Your campus identity details have been saved successfully.');
      setIsEditModalOpen(false);
      if (updatedData?.profile) {
        updateProfileState(updatedData.profile);
      }
      queryClient.invalidateQueries({ queryKey: ['user-public-profile', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-logins'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Update Failed', err.message);
    },
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
      <Card className="glass-panel border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <Avatar
              name={profile.fullName}
              src={profile.avatarUrl}
              size="xl"
              role={isMyProfile ? currentUser?.role : undefined}
              verified={profile.verificationStatus === 'approved'}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-white flex items-center gap-1.5">
                  {profile.fullName}
                  <TrustBadge
                    role={isMyProfile ? currentUser?.role : undefined}
                    tier={profile.verificationTier || (profile.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                    iconOnly
                    size="md"
                  />
                </h1>
                <TrustBadge
                  role={isMyProfile ? currentUser?.role : undefined}
                  tier={profile.verificationTier || (profile.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                  size="sm"
                />
              </div>

              {/* Academic Details & Badges */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs text-slate-300 mt-1.5">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{profile.collegeName || 'KIET Group of Institutions'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Year {profile.academicYear || 1}</span>
                </span>
                {profile.branch && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-sky-300 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>{profile.branch}</span>
                    </span>
                  </>
                )}
                {profile.rollNumber && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-amber-300 font-mono text-[11px] font-bold">
                      <Hash className="w-3 h-3 text-amber-400" />
                      <span>Roll No: {profile.rollNumber}</span>
                    </span>
                  </>
                )}
                {profile.studentId && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/60 text-indigo-300 font-mono text-[11px] font-bold">
                      <BadgePercent className="w-3 h-3 text-indigo-400" />
                      <span>ID: {profile.studentId}</span>
                    </span>
                  </>
                )}
                {profile.gender && (
                  <>
                    <span>•</span>
                    <span className="capitalize text-slate-400 font-medium">
                      {profile.gender}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isMyProfile ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="w-4 h-4 text-indigo-400" />}
                onClick={() => setIsEditModalOpen(true)}
                className="bg-slate-900/90 border-slate-700 hover:border-indigo-500/60 text-slate-200"
              >
                Edit Profile
              </Button>
            ) : (
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
        </div>

        {profile.bio ? (
          <div className="space-y-1 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">About</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              &ldquo;{profile.bio}&rdquo;
            </p>
          </div>
        ) : isMyProfile ? (
          <div
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs text-slate-500 italic bg-slate-900/40 p-3 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-colors text-center"
          >
            + Add an about bio to let ride companions know your commute routine...
          </div>
        ) : null}

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

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile & Campus Identity"
        description="Update your academic credentials, student roll number, and about bio."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => updateProfileMutation.mutate()}
              isLoading={updateProfileMutation.isPending}
              disabled={!editFullName.trim()}
            >
              Save Profile Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Full Name"
            placeholder="e.g. Yogita Mishra"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            required
          />

          <Select
            label="Branch / Department"
            value={editBranch}
            onChange={(e) => setEditBranch(e.target.value)}
            options={CAMPUS_BRANCHES}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="College Roll No"
              placeholder="e.g. 2327CS1097"
              value={editRollNumber}
              onChange={(e) => setEditRollNumber(e.target.value)}
            />

            <Input
              label="Student ID"
              placeholder="e.g. STU-2023-1097"
              value={editStudentId}
              onChange={(e) => setEditStudentId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Academic Year"
              value={editAcademicYear}
              onChange={(e) => setEditAcademicYear(Number(e.target.value))}
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
              ]}
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditGender('male')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    editGender === 'male'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setEditGender('female')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    editGender === 'female'
                      ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          <Input
            label="Phone / WhatsApp Number (Optional)"
            placeholder="e.g. +91 98765 43210"
            value={editPhoneNumber}
            onChange={(e) => setEditPhoneNumber(e.target.value)}
            helperText="Used for ride coordination with accepted co-commuters."
          />

          <Textarea
            label="About"
            placeholder="Tell other commuters about yourself, your routine, and commute preferences..."
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

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
