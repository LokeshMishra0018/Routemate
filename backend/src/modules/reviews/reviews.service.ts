import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { reviewsRepository } from './reviews.repository.js';
import { usersService } from '../users/users.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { ReviewDocument, ReviewResponseDto } from './reviews.types.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';

export interface CreateReviewInput {
  reviewerId: string;
  reviewedUserId: string;
  tripId: string;
  rating: number;
  cleanlinessRating?: number;
  punctualityRating?: number;
  communicationRating?: number;
  comment?: string;
  tags?: string[];
}

export class ReviewsService {
  private async formatReviewDto(doc: ReviewDocument): Promise<ReviewResponseDto> {
    const reviewer = await usersService.getPublicProfile(doc.reviewerId).catch(() => null);

    return {
      id: doc._id.toHexString(),
      reviewerId: doc.reviewerId,
      reviewedUserId: doc.reviewedUserId,
      tripId: doc.tripId,
      rating: doc.rating,
      cleanlinessRating: doc.cleanlinessRating || null,
      punctualityRating: doc.punctualityRating || null,
      communicationRating: doc.communicationRating || null,
      comment: doc.comment || null,
      tags: doc.tags || null,
      reviewer,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Recalculates and persists a student's trust score and rating metrics
   */
  async recalculateTrustScore(userId: string): Promise<number> {
    const db = getDb();
    const [user, profile, ratingSummary, completedTripsCount] = await Promise.all([
      db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(userId) }),
      db.collection(COLLECTIONS.PROFILES).findOne({ userId }),
      reviewsRepository.computeUserRatingSummary(userId),
      db.collection(COLLECTIONS.TRIPS).countDocuments({ userId, status: 'completed' }),
    ]);

    if (!user || !profile) {
      return 0;
    }

    let score = 0;

    // 1. Email Verification (+20)
    if (user.emailVerifiedAt !== null || (user as any).isEmailVerified) {
      score += 20;
    }

    // 2. ID Verification (+30)
    if (profile.verificationStatus === 'approved' || (profile as any).verification?.status === 'approved') {
      score += 30;
    }

    // 3. Completed Trips (+2 per trip, max 20)
    score += Math.min(20, completedTripsCount * 2);

    // 4. Rating component (up to +30)
    if (ratingSummary.totalReviews > 0) {
      score += (ratingSummary.averageRating / 5) * 30;
    } else {
      score += 15; // Neutral starting baseline if no reviews yet
    }

    const finalTrustScore = Math.min(100, Math.max(0, Math.round(score)));

    // Update profile
    await db.collection(COLLECTIONS.PROFILES).updateOne(
      { userId },
      {
        $set: {
          trustScore: finalTrustScore,
          averageRating: ratingSummary.averageRating,
          rating: {
            average: ratingSummary.averageRating,
            count: ratingSummary.totalReviews,
          },
          updatedAt: new Date(),
        },
      }
    );

    return finalTrustScore;
  }

  /**
   * Submit a review for a co-traveler
   */
  async submitReview(input: CreateReviewInput): Promise<ReviewResponseDto> {
    if (input.reviewerId === input.reviewedUserId) {
      throw new BadRequestError('You cannot review yourself');
    }

    const db = getDb();

    // Verify trip exists
    const trip = await db.collection(COLLECTIONS.TRIPS).findOne({ _id: new ObjectId(input.tripId) });
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Check duplicate review
    const existing = await reviewsRepository.findReview(input.reviewerId, input.reviewedUserId, input.tripId);
    if (existing) {
      throw new ConflictError('You have already submitted a review for this user on this trip');
    }

    // Verify co-travel relationship (either via direct trip creator, accepted connection, or group membership)
    const [conn, groupMember] = await Promise.all([
      db.collection(COLLECTIONS.CONNECTIONS).findOne({
        tripId: input.tripId,
        status: 'accepted',
        $or: [
          { requesterId: input.reviewerId, recipientId: input.reviewedUserId },
          { requesterId: input.reviewedUserId, recipientId: input.reviewerId },
        ],
      }),
      db.collection(COLLECTIONS.GROUP_MEMBERS).findOne({
        userId: { $in: [input.reviewerId, input.reviewedUserId] },
        status: 'active',
      }),
    ]);

    const isDirectTripParticipant =
      (trip.userId === input.reviewerId || trip.userId === input.reviewedUserId) && (conn !== null || groupMember !== null);

    if (!isDirectTripParticipant && !conn && !groupMember) {
      throw new BadRequestError('You can only review users you have traveled or connected with on this trip');
    }

    const doc = await reviewsRepository.createReview({
      reviewerId: input.reviewerId,
      reviewedUserId: input.reviewedUserId,
      tripId: input.tripId,
      rating: input.rating,
      cleanlinessRating: input.cleanlinessRating || null,
      punctualityRating: input.punctualityRating || null,
      communicationRating: input.communicationRating || null,
      comment: input.comment || null,
      tags: input.tags || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Recalculate recipient trust score & rating
    await this.recalculateTrustScore(input.reviewedUserId);

    // Notify reviewed user
    const reviewerProfile = await usersService.getPublicProfile(input.reviewerId).catch(() => null);
    await notificationsService.createNotification({
      userId: input.reviewedUserId,
      type: 'review_available',
      title: 'New Review Received',
      body: reviewerProfile?.fullName
        ? `${reviewerProfile.fullName} left you a ${input.rating}-star review!`
        : `You received a new ${input.rating}-star review!`,
      data: {
        reviewId: doc._id.toHexString(),
        tripId: input.tripId,
        rating: input.rating,
      },
    });

    return this.formatReviewDto(doc);
  }

  /**
   * List reviews and rating summary for a user
   */
  async getUserReviews(userId: string, page = 1, pageSize = 20) {
    const [{ items, totalCount }, summary] = await Promise.all([
      reviewsRepository.findReviewsByUser(userId, page, pageSize),
      reviewsRepository.computeUserRatingSummary(userId),
    ]);

    const formatted = await Promise.all(items.map((r) => this.formatReviewDto(r)));

    return {
      items: formatted,
      summary,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * List reviews for a specific trip
   */
  async getTripReviews(tripId: string, page = 1, pageSize = 20) {
    const { items, totalCount } = await reviewsRepository.findReviewsByTrip(tripId, page, pageSize);
    const formatted = await Promise.all(items.map((r) => this.formatReviewDto(r)));

    return {
      items: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }
}

export const reviewsService = new ReviewsService();
