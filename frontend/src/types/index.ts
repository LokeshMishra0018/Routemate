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

// ==========================================
// ADMIN COMMAND CENTER & TELEMETRY TYPES
// ==========================================

export interface LivePresenceUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  college: string;
  role: string;
  currentPath: string;
  currentAction: string;
  deviceCategory: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browserInfo: string;
  connectedAt: string;
  lastPingAt: string;
  isIdle: boolean;
  sessionDurationSeconds: number;
}

export interface LivePresenceResponse {
  totalOnline: number;
  activeNow: number;
  idleCount: number;
  users: LivePresenceUser[];
  pageDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  timestamp: string;
}

export interface LiveTelemetryEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AdminOverviewStats {
  users: {
    total: number;
    verified: number;
    verificationRate: number;
    liveOnline: number;
    activeToday: number;
    newToday: number;
  };
  trips: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    seatFillRate: number;
  };
  impact: {
    costSavedInr: number;
    carbonSavedKg: number;
  };
  queues: {
    pendingVerifications: number;
    openReports: number;
    activeSos: number;
  };
  topCorridors: Array<{
    source: string;
    destination: string;
    tripCount: number;
    avgFare: number;
  }>;
  hourlyDemand: Array<{
    hour: string;
    hourNum: number;
    tripsCount: number;
  }>;
  recentEvents: LiveTelemetryEvent[];
  peakOnline?: {
    currentLive: number;
    todayPeak: number;
    todayPeakTime: string;
    allTimePeak: number;
    allTimePeakDate: string;
  };
  breakdown?: {
    verifications: {
      verified: number;
      pending: number;
      admin: number;
    };
    authMethods: {
      google: number;
      emailPassword: number;
    };
    tripStatus: {
      completed: number;
      planned: number;
      inProgress: number;
      cancelled: number;
    };
  };
  trendCurves?: {
    hours1: Array<{ label: string; isoTime?: string; minsAgo?: number; value: number }>;
    hours24: Array<{ label: string; isoTime?: string; hoursAgo?: number; value: number; hour?: number }>;
    days7: Array<{ label: string; fullDate?: string; isoTime?: string; daysAgo?: number; value: number }>;
    days30: Array<{ label: string; isoTime?: string; daysAgo?: number; value: number }>;
  };
}

export interface AdminFunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface AdminFunnelResponse {
  period: string;
  stages: AdminFunnelStage[];
  retentionCohorts: Array<{
    week: string;
    registered: number;
    activeW1: number;
    activeW2: number;
    activeW3: number;
    activeW4: number;
    retentionRate: string;
  }>;
}

export interface AdminDemandRoute {
  id: string;
  from: string;
  to: string;
  searchVolume: number;
  tripsAvailable: number;
  unmetRatioPercent: number;
  avgFare: number;
  peakTime: string;
}

export interface AdminDemandResponse {
  totalActivePlannedTrips: number;
  demandRoutes: AdminDemandRoute[];
  unservedAlerts: Array<{
    from: string;
    to: string;
    unmetSearches: number;
    suggestedAction: string;
  }>;
}

export interface AdminSystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  activeSockets: number;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  requests: {
    total: number;
    rpm: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    errorRatePercent: number;
  };
  latencyMs: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface AdminTripItem {
  id: string;
  userId: string;
  hostName: string;
  hostEmail: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  vehicleType: string;
  totalSeats: number;
  availableSeats: number;
  fareAmount: number;
  status: string;
  isHidden?: boolean;
  adminNotes?: string | null;
  revisionRequestedAt?: string | null;
  passengersCount: number;
  createdAt: string;
}

export interface AdminTripPassenger {
  id: string;
  userId: string;
  fullName: string;
  trustScore: number;
  verificationStatus: string;
  status: string;
  pickupSpot?: string;
  seatsRequested: number;
  joinedAt: string;
}

export interface AdminTripManifest {
  trip: {
    id: string;
    userId: string;
    source: { name: string; coordinates?: [number, number] };
    destination: { name: string; coordinates?: [number, number] };
    stops: Array<{ name: string; coordinates?: [number, number] }>;
    travelDate: string;
    departureTime: string;
    vehicleType: string;
    totalSeats: number;
    availableSeats: number;
    fareAmount: number;
    status: string;
    isHidden: boolean;
    adminNotes?: string | null;
    notes?: string | null;
    createdAt: string;
  };
  host: {
    userId: string;
    fullName: string;
    email: string;
    trustScore: number;
    verificationStatus: string;
    collegeName: string;
    avatarUrl?: string | null;
  };
  passengers: AdminTripPassenger[];
}

export interface AdminMatchingStats {
  totalMatchesGenerated: number;
  acceptedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  acceptanceRatePercent: number;
  avgMatchTimeSeconds: number;
  algorithmDistribution: {
    geospatialScoreAvg: number;
    timeScoreAvg: number;
    routeVectorScoreAvg: number;
    trustScoreAvg: number;
  };
}

export interface AdminGroupItem {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  memberCount: number;
  isOfficial: boolean;
  createdAt: string;
}

