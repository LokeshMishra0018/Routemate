import { ObjectId } from 'mongodb';
import { PublicProfileDto } from '../users/users.types.js';

export interface ReviewDocument {
  _id: ObjectId;
  reviewerId: string;
  reviewedUserId: string;
  tripId: string;
  rating: number; // 1 to 5
  cleanlinessRating?: number | null;
  punctualityRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewResponseDto {
  id: string;
  reviewerId: string;
  reviewedUserId: string;
  tripId: string;
  rating: number;
  cleanlinessRating?: number | null;
  punctualityRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
  tags?: string[] | null;
  reviewer?: PublicProfileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRatingSummaryDto {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  subRatings: {
    cleanliness: number | null;
    punctuality: number | null;
    communication: number | null;
  };
}
