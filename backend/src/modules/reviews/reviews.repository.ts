import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { ReviewDocument, UserRatingSummaryDto } from './reviews.types.js';

export class ReviewsRepository {
  private get collection() {
    return getDb().collection<ReviewDocument>(COLLECTIONS.REVIEWS);
  }

  async createReview(data: Omit<ReviewDocument, '_id'>): Promise<ReviewDocument> {
    const doc: ReviewDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async findReview(reviewerId: string, reviewedUserId: string, tripId: string): Promise<ReviewDocument | null> {
    return this.collection.findOne({ reviewerId, reviewedUserId, tripId });
  }

  async findReviewsByUser(
    reviewedUserId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ReviewDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { reviewedUserId };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async findReviewsByTrip(
    tripId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ReviewDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { tripId };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async computeUserRatingSummary(reviewedUserId: string): Promise<UserRatingSummaryDto> {
    const reviews = await this.collection.find({ reviewedUserId }).toArray();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        subRatings: { cleanliness: null, punctuality: null, communication: null },
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let cleanSum = 0;
    let cleanCount = 0;
    let punctSum = 0;
    let punctCount = 0;
    let commSum = 0;
    let commCount = 0;

    for (const r of reviews) {
      const roundedRating = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[roundedRating]++;
      ratingSum += r.rating;

      if (r.cleanlinessRating) {
        cleanSum += r.cleanlinessRating;
        cleanCount++;
      }
      if (r.punctualityRating) {
        punctSum += r.punctualityRating;
        punctCount++;
      }
      if (r.communicationRating) {
        commSum += r.communicationRating;
        commCount++;
      }
    }

    const averageRating = Math.round((ratingSum / reviews.length) * 10) / 10;
    const cleanliness = cleanCount > 0 ? Math.round((cleanSum / cleanCount) * 10) / 10 : null;
    const punctuality = punctCount > 0 ? Math.round((punctSum / punctCount) * 10) / 10 : null;
    const communication = commCount > 0 ? Math.round((commSum / commCount) * 10) / 10 : null;

    return {
      averageRating,
      totalReviews: reviews.length,
      distribution,
      subRatings: { cleanliness, punctuality, communication },
    };
  }
}

export const reviewsRepository = new ReviewsRepository();
