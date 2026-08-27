import { ObjectId } from 'mongodb';
import { GeoPoint } from '../trips/trips.types.js';
import { PublicProfileDto } from '../users/users.types.js';

export type ReportCategory =
  | 'harassment'
  | 'fraud'
  | 'unsafe_driving'
  | 'no_show'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type SosStatus = 'active' | 'resolved' | 'false_alarm';

export interface ReportDocument {
  _id: ObjectId;
  reporterId: string;
  reportedUserId?: string | null;
  tripId?: string | null;
  category: ReportCategory;
  reason: string;
  evidenceUrls?: string[] | null;
  status: ReportStatus;
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContactDocument {
  _id: ObjectId;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SosEventDocument {
  _id: ObjectId;
  userId: string;
  tripId?: string | null;
  location?: GeoPoint | null;
  status: SosStatus;
  triggeredAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
}

export interface ReportResponseDto {
  id: string;
  reporterId: string;
  reportedUserId?: string | null;
  tripId?: string | null;
  category: ReportCategory;
  reason: string;
  evidenceUrls?: string[] | null;
  status: ReportStatus;
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  reporter?: PublicProfileDto | null;
  reportedUser?: PublicProfileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContactResponseDto {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SosEventResponseDto {
  id: string;
  userId: string;
  tripId?: string | null;
  location?: GeoPoint | null;
  status: SosStatus;
  triggeredAt: string;
  resolvedAt?: string | null;
  user?: PublicProfileDto | null;
}
