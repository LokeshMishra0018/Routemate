export type UserRole = 'student' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';
export type VerificationTier = 'unverified' | 'partially_verified' | 'fully_verified' | 'admin' | 'moderator';
export type TransportType = 'train' | 'bus' | 'flight' | 'cab' | 'personal_vehicle' | 'other';
export type TripStatus = 'planning' | 'confirmed' | 'upcoming' | 'travelling' | 'completed' | 'cancelled';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type ReportCategory = 'harassment' | 'fraud' | 'unsafe_driving' | 'no_show' | 'inappropriate_content' | 'other';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type SosStatus = 'active' | 'resolved' | 'false_alarm';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  fullName?: string;
  avatarUrl?: string | null;
  collegeId?: string;
  collegeName?: string;
  trustScore?: number;
  verificationStatus?: VerificationStatus;
  verificationTier?: VerificationTier;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  collegeId: string;
  collegeName?: string;
  academicYear: number;
  gender: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verificationStatus: VerificationStatus;
  verificationTier?: VerificationTier;
  trustScore: number;
  averageRating: number;
  completedTripCount: number;
  connectionCount: number;
  rating?: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  collegeId?: string;
  collegeName?: string;
  academicYear?: number;
  gender?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verificationStatus: VerificationStatus;
  verificationTier?: VerificationTier;
  trustScore: number;
  averageRating: number;
  completedTripCount: number;
  connectionCount: number;
}

export interface College {
  id: string;
  name: string;
  domain: string;
  city?: string;
  state?: string;
  isActive: boolean;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LocationPoint {
  name: string;
  coordinates?: GeoPoint;
}

export interface TripStop {
  name: string;
  coordinates?: GeoPoint;
  sequenceNumber: number;
  estimatedArrivalTime?: string;
}

export interface TripPreferences {
  genderPreference?: 'any' | 'same_gender';
  conversationPreference?: 'quiet' | 'moderate' | 'chatty';
  smokingPreference?: 'no' | 'yes';
  musicPreference?: 'no' | 'yes';
  otherNotes?: string;
}

export interface CostSharingConfig {
  enabled: boolean;
  estimatedTotalCost?: number;
  currency: string;
}

export interface Trip {
  id: string;
  userId: string;
  user?: PublicProfile;
  source: LocationPoint;
  destination: LocationPoint;
  travelDate: string;
  departureTime?: string;
  estimatedArrivalTime?: string;
  transportType: TransportType;
  status: TripStatus;
  stops?: TripStop[];
  preferences?: TripPreferences;
  costSharing?: CostSharingConfig;
  availableSeats?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  routeOverlapScore: number;
  timeScore: number;
  dateScore: number;
  transportScore: number;
  preferenceScore: number;
  verificationScore: number;
  totalScore: number;
}

export interface MatchResult {
  matchedTrip: Trip;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  isCompatible: boolean;
}

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  tripId?: string;
  status: ConnectionStatus;
  message?: string;
  requester?: PublicProfile;
  recipient?: PublicProfile;
  trip?: Trip;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId: string;
  lastReadAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantProfiles?: Record<string, PublicProfile>;
  lastMessage?: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sender?: PublicProfile;
  readBy?: string[];
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user?: PublicProfile;
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
  joinedAt: string;
}

export interface Group {
  id: string;
  tripId: string;
  trip?: Trip;
  name: string;
  description?: string;
  ownerId: string;
  maxCapacity: number;
  currentMemberCount: number;
  members?: GroupMember[];
  costSplit?: {
    totalEstimatedCost: number;
    currency: string;
    costPerMember: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewedUserId: string;
  tripId: string;
  rating: number;
  cleanlinessRating?: number;
  punctualityRating?: number;
  communicationRating?: number;
  comment?: string;
  tags?: string[];
  reviewer?: PublicProfile;
  createdAt: string;
}

export interface UserRatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  subRatings: {
    cleanliness: number;
    punctuality: number;
    communication: number;
  };
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface IncidentReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  tripId?: string;
  category: ReportCategory;
  reason: string;
  evidenceUrls?: string[];
  status: ReportStatus;
  resolutionNotes?: string;
  createdAt: string;
}

export interface SosEvent {
  id: string;
  userId: string;
  user?: PublicProfile;
  tripId?: string;
  location?: GeoPoint;
  status: SosStatus;
  triggeredAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  user?: User;
  collegeId: string;
  documentMimeType: string;
  documentSize: number;
  status: VerificationStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface UserSafetyHistory {
  userId: string;
  email: string;
  status: UserStatus;
  trustScore: number;
  verificationStatus: VerificationStatus;
  reportsAgainstCount: number;
  reportsByCount: number;
  sosEventsCount: number;
  reportsAgainst: Array<{
    id: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
