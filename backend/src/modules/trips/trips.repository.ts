import { ObjectId, Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { TripDocument, RecurringTripDocument, SearchTripsFilter } from './trips.types.js';

export class TripsRepository {
  private get collection() {
    return getDb().collection<TripDocument>(COLLECTIONS.TRIPS);
  }

  private get recurringCollection() {
    return getDb().collection<RecurringTripDocument>(COLLECTIONS.RECURRING_TRIPS);
  }

  async createTrip(data: Omit<TripDocument, '_id'>): Promise<TripDocument> {
    const res = await this.collection.insertOne(data as TripDocument);
    return { ...data, _id: res.insertedId };
  }

  async findTripById(id: string): Promise<TripDocument | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findUserTrips(userId: string, page = 1, pageSize = 20): Promise<{ items: TripDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { userId };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ travelDate: -1, departureTime: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async searchTrips(filters: SearchTripsFilter): Promise<{ items: TripDocument[]; totalCount: number }> {
    const query: Filter<TripDocument> = {};
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Filter by User / Exclude User
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.excludeUserId) {
      query.userId = { $ne: filters.excludeUserId };
    }

    // Filter by Status (default to confirmed or planning active trips)
    if (filters.status) {
      query.status = filters.status;
    } else if (!filters.userId) {
      query.status = { $in: ['planning', 'confirmed', 'upcoming'] };
    }

    // Filter by Transport
    if (filters.transportType) {
      query.transportType = filters.transportType;
    }

    // Filter by Gender Preference
    if (filters.genderPreference) {
      query['preferences.genderPreference'] = filters.genderPreference;
    }

    // Filter by Travel Date range
    if (filters.travelDate) {
      query.travelDate = filters.travelDate;
    } else if (filters.startDate || filters.endDate) {
      query.travelDate = {};
      if (filters.startDate) (query.travelDate as Record<string, string>).$gte = filters.startDate;
      if (filters.endDate) (query.travelDate as Record<string, string>).$lte = filters.endDate;
    }

    // Filter by Normalized Location Names
    if (filters.sourceName) {
      query['source.normalizedName'] = { $regex: filters.sourceName.toLowerCase().trim(), $options: 'i' };
    }
    if (filters.destinationName) {
      query['destination.normalizedName'] = { $regex: filters.destinationName.toLowerCase().trim(), $options: 'i' };
    }

    // Geospatial Radius Queries
    if (filters.sourceNear) {
      const radiusRadians = (filters.sourceNear.maxDistanceMeters || 50000) / 6378137; // Earth radius in meters
      query['source.coordinates'] = {
        $geoWithin: {
          $centerSphere: [
            [filters.sourceNear.longitude, filters.sourceNear.latitude],
            radiusRadians,
          ],
        },
      };
    }

    if (filters.destinationNear) {
      const radiusRadians = (filters.destinationNear.maxDistanceMeters || 50000) / 6378137;
      query['destination.coordinates'] = {
        $geoWithin: {
          $centerSphere: [
            [filters.destinationNear.longitude, filters.destinationNear.latitude],
            radiusRadians,
          ],
        },
      };
    }

    const [items, totalCount] = await Promise.all([
      this.collection.find(query).sort({ travelDate: 1, departureTime: 1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query),
    ]);

    return { items, totalCount };
  }

  async updateTrip(id: string, update: Partial<TripDocument>): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } }
    );
  }

  async deleteTrip(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  // --- Recurring Trips ---
  async createRecurringTrip(data: Omit<RecurringTripDocument, '_id'>): Promise<RecurringTripDocument> {
    const res = await this.recurringCollection.insertOne(data as RecurringTripDocument);
    return { ...data, _id: res.insertedId };
  }

  async findUserRecurringTrips(userId: string): Promise<RecurringTripDocument[]> {
    return this.recurringCollection.find({ userId, isActive: true }).toArray();
  }

  async deleteRecurringTrip(id: string, userId: string): Promise<void> {
    await this.recurringCollection.updateOne(
      { _id: new ObjectId(id), userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  }
}

export const tripsRepository = new TripsRepository();
