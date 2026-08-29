import { ObjectId } from 'mongodb';
import { PublicProfileDto } from '../users/users.types.js';

export type TransportType = 'train' | 'bus' | 'flight' | 'cab' | 'personal_vehicle' | 'other';

export type TripStatus = 'planning' | 'confirmed' | 'upcoming' | 'travelling' | 'completed' | 'cancelled';

export type GenderPreference = 'any' | 'same_gender';
export type ConversationPreference = 'quiet' | 'moderate' | 'talkative';
export type SmokingPreference = 'no' | 'yes';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LocationPoint {
  name: string;
  normalizedName: string;
  coordinates: GeoPoint;
}

export interface TripStop extends LocationPoint {
  sequenceNumber: number;
  estimatedArrivalTime?: string | null;
}

export interface TripPreferences {
  genderPreference: GenderPreference;
  conversationPreference?: ConversationPreference | null;
  smokingPreference?: SmokingPreference | null;
  other?: string | null;
}

export interface CostSharing {
  enabled: boolean;
  estimatedTotalCost?: number | null;
  currency?: string | null;
}

export interface MeetingPoint {
  name: string;
  coordinates: GeoPoint;
  notes?: string | null;
}

export interface TripDocument {
  _id: ObjectId;
  userId: string;
  source: LocationPoint;
  destination: LocationPoint;
  travelDate: string; // ISO format: YYYY-MM-DD
  departureTime: string; // HH:MM (24-hour format)
  estimatedArrivalTime?: string | null;
  transportType: TransportType;
  status: TripStatus;
  stops: TripStop[];
  preferences: TripPreferences;
  costSharing: CostSharing;
  availableSeats: number;
  notes?: string | null;
  meetingPoint?: MeetingPoint | null;
  isRecurring: boolean;
  recurringTripId?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: 'host' | 'admin' | null;
  deletionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringTripDocument {
  _id: ObjectId;
  userId: string;
  source: LocationPoint;
  destination: LocationPoint;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  departureTime: string; // HH:MM
  transportType: TransportType;
  preferences: TripPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripResponseDto {
  id: string;
  userId: string;
  creator?: PublicProfileDto | null;
  user?: PublicProfileDto | null;
  source: LocationPoint;
  destination: LocationPoint;
  travelDate: string;
  departureTime: string;
  estimatedArrivalTime: string | null;
  transportType: TransportType;
  status: TripStatus;
  stops: TripStop[];
  preferences: TripPreferences;
  costSharing: CostSharing;
  availableSeats: number;
  notes: string | null;
  meetingPoint: MeetingPoint | null;
  isRecurring: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: 'host' | 'admin' | null;
  deletionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchTripsFilter {
  q?: string;
  sourceName?: string;
  destinationName?: string;
  sourceNear?: { longitude: number; latitude: number; maxDistanceMeters?: number };
  destinationNear?: { longitude: number; latitude: number; maxDistanceMeters?: number };
  travelDate?: string;
  startDate?: string;
  endDate?: string;
  transportType?: TransportType;
  status?: TripStatus;
  genderPreference?: GenderPreference;
  excludeUserId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}
