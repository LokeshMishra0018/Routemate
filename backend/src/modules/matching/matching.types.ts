import { ObjectId } from 'mongodb';
import { TripDocument } from '../trips/trips.types.js';
import { PublicProfileDto } from '../users/users.types.js';

export type MatchStatus = 'active' | 'dismissed' | 'expired' | 'connected';

export interface MatchScores {
  score: number; // 0 - 100
  routeScore: number; // 0.0 - 1.0
  destinationScore: number; // 0.0 - 1.0
  dateScore: number; // 0.0 - 1.0
  timeScore: number; // 0.0 - 1.0
  transportScore: number; // 0.0 - 1.0
  preferenceScore: number; // 0.0 - 1.0
}

export interface MatchDocument {
  _id: ObjectId;
  tripId: string;
  candidateTripId: string;
  userId: string;
  candidateUserId: string;
  score: number;
  routeScore: number;
  destinationScore: number;
  dateScore: number;
  timeScore: number;
  transportScore: number;
  preferenceScore: number;
  explanation: string[];
  status: MatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateContext {
  targetTrip: TripDocument;
  candidateTrip: TripDocument;
  targetGender?: string | null;
  candidateGender?: string | null;
}

export interface MatchResponseDto {
  id: string;
  tripId: string;
  candidateTripId: string;
  candidateUser: PublicProfileDto | null;
  candidateTrip: {
    id: string;
    source: TripDocument['source'];
    destination: TripDocument['destination'];
    travelDate: string;
    departureTime: string;
    transportType: TripDocument['transportType'];
    availableSeats: number;
    notes: string | null;
  };
  score: number;
  routeScore: number;
  destinationScore: number;
  dateScore: number;
  timeScore: number;
  transportScore: number;
  preferenceScore: number;
  explanation: string[];
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}
