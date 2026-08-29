import { tripsRepository } from './trips.repository.js';
import { usersService } from '../users/users.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors.js';
import {
  TripDocument,
  TripResponseDto,
  SearchTripsFilter,
  TripStatus,
  TripStop,
  LocationPoint,
  GeoPoint,
  TransportType,
  TripPreferences,
  CostSharing,
  MeetingPoint,
} from './trips.types.js';

export class TripsService {
  private formatTripResponse(trip: TripDocument, creatorProfile?: TripResponseDto['creator']): TripResponseDto {
    return {
      id: trip._id.toHexString(),
      userId: trip.userId,
      creator: creatorProfile || null,
      user: creatorProfile || null,
      source: trip.source,
      destination: trip.destination,
      travelDate: trip.travelDate,
      departureTime: trip.departureTime,
      estimatedArrivalTime: trip.estimatedArrivalTime || null,
      transportType: trip.transportType,
      status: trip.status,
      stops: trip.stops || [],
      preferences: trip.preferences,
      costSharing: trip.costSharing,
      availableSeats: trip.availableSeats,
      notes: trip.notes || null,
      meetingPoint: trip.meetingPoint || null,
      isRecurring: trip.isRecurring,
      isDeleted: trip.isDeleted || false,
      deletedAt: trip.deletedAt ? trip.deletedAt.toISOString() : null,
      deletedBy: trip.deletedBy || null,
      deletionReason: trip.deletionReason || null,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }

  private normalizeLocation(loc: { name: string; coordinates: GeoPoint }): LocationPoint {
    return {
      name: loc.name.trim(),
      normalizedName: loc.name.toLowerCase().trim(),
      coordinates: loc.coordinates,
    };
  }

  private normalizeStops(stops: Array<{ name: string; coordinates: GeoPoint; sequenceNumber: number; estimatedArrivalTime?: string | null }>): TripStop[] {
    return stops.map((stop, index) => ({
      name: stop.name.trim(),
      normalizedName: stop.name.toLowerCase().trim(),
      coordinates: stop.coordinates,
      sequenceNumber: stop.sequenceNumber || index + 1,
      estimatedArrivalTime: stop.estimatedArrivalTime || null,
    }));
  }

  /**
   * Create a new trip
   */
  async createTrip(
    userId: string,
    data: {
      source: { name: string; coordinates: GeoPoint };
      destination: { name: string; coordinates: GeoPoint };
      travelDate: string;
      departureTime: string;
      estimatedArrivalTime?: string | null;
      transportType: TransportType;
      stops?: Array<{ name: string; coordinates: GeoPoint; sequenceNumber: number; estimatedArrivalTime?: string | null }>;
      preferences?: TripPreferences;
      costSharing?: CostSharing;
      availableSeats?: number;
      notes?: string | null;
      meetingPoint?: MeetingPoint | null;
    }
  ): Promise<TripResponseDto> {
    const source = this.normalizeLocation(data.source);
    const destination = this.normalizeLocation(data.destination);
    const stops = data.stops ? this.normalizeStops(data.stops) : [];

    const now = new Date();
    const doc = await tripsRepository.createTrip({
      userId,
      source,
      destination,
      travelDate: data.travelDate,
      departureTime: data.departureTime,
      estimatedArrivalTime: data.estimatedArrivalTime || null,
      transportType: data.transportType,
      status: 'planning',
      stops,
      preferences: data.preferences || { genderPreference: 'any' },
      costSharing: data.costSharing || { enabled: false },
      availableSeats: data.availableSeats !== undefined ? data.availableSeats : 1,
      notes: data.notes?.trim() || null,
      meetingPoint: data.meetingPoint || null,
      isRecurring: false,
      recurringTripId: null,
      createdAt: now,
      updatedAt: now,
    });

    // Generate matches immediately in background
    import('../matching/matching.service.js')
      .then(({ matchingService }) => matchingService.generateMatchesForTrip(doc._id.toHexString()))
      .catch(() => {});

    const creatorProfile = await usersService.getPublicProfile(userId).catch(() => null);
    return this.formatTripResponse(doc, creatorProfile);
  }

  /**
   * Get trip by ID with populated creator profile
   */
  async getTripById(id: string): Promise<TripResponseDto> {
    const trip = await tripsRepository.findTripById(id);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    const creatorProfile = await usersService.getPublicProfile(trip.userId).catch(() => null);
    return this.formatTripResponse(trip, creatorProfile);
  }

  /**
   * Update existing trip (strictly validates ownership)
   */
  async updateTrip(
    userId: string,
    tripId: string,
    data: {
      source?: { name: string; coordinates: GeoPoint };
      destination?: { name: string; coordinates: GeoPoint };
      travelDate?: string;
      departureTime?: string;
      estimatedArrivalTime?: string | null;
      transportType?: TransportType;
      stops?: Array<{ name: string; coordinates: GeoPoint; sequenceNumber: number; estimatedArrivalTime?: string | null }>;
      preferences?: TripPreferences;
      costSharing?: CostSharing;
      availableSeats?: number;
      notes?: string | null;
      meetingPoint?: MeetingPoint | null;
    }
  ): Promise<TripResponseDto> {
    const trip = await tripsRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this trip');
    }

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      throw new ValidationError(`Cannot modify a trip that is already ${trip.status}`);
    }

    const updates: Partial<TripDocument> = {};
    if (data.source) updates.source = this.normalizeLocation(data.source);
    if (data.destination) updates.destination = this.normalizeLocation(data.destination);
    if (data.travelDate) updates.travelDate = data.travelDate;
    if (data.departureTime) updates.departureTime = data.departureTime;
    if (data.estimatedArrivalTime !== undefined) updates.estimatedArrivalTime = data.estimatedArrivalTime;
    if (data.transportType) updates.transportType = data.transportType;
    if (data.stops) updates.stops = this.normalizeStops(data.stops);
    if (data.preferences) updates.preferences = data.preferences;
    if (data.costSharing) updates.costSharing = data.costSharing;
    if (data.availableSeats !== undefined) updates.availableSeats = data.availableSeats;
    if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;
    if (data.meetingPoint !== undefined) updates.meetingPoint = data.meetingPoint;

    await tripsRepository.updateTrip(tripId, updates);
    return this.getTripById(tripId);
  }

  /**
   * Update trip lifecycle status
   */
  async updateTripStatus(userId: string, tripId: string, status: TripStatus, role?: string): Promise<TripResponseDto> {
    const trip = await tripsRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.userId !== userId && role !== 'admin') {
      throw new ForbiddenError('You do not have permission to update the status of this trip');
    }

    await tripsRepository.updateTrip(tripId, { status });
    return this.getTripById(tripId);
  }

  /**
   * Delete or cancel trip (Soft-deletion with audit logging)
   */
  async deleteTrip(userId: string, tripId: string, role?: string, reason?: string): Promise<{ message: string }> {
    const trip = await tripsRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.userId !== userId && role !== 'admin') {
      throw new ForbiddenError('You do not have permission to delete this trip');
    }

    const deletedBy = role === 'admin' ? 'admin' : 'host';
    await tripsRepository.deleteTrip(tripId, deletedBy, reason);
    return { message: 'Trip cancelled and removed from active search' };
  }

  /**
   * Restore a deleted or cancelled trip (Admin only)
   */
  async restoreTrip(tripId: string, role?: string): Promise<{ message: string }> {
    if (role !== 'admin') {
      throw new ForbiddenError('Only campus administrators can restore trips');
    }

    const trip = await tripsRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    await tripsRepository.restoreTrip(tripId);
    return { message: 'Trip restored to active status successfully' };
  }

  /**
   * Search trips with multi-criteria and geospatial radius filters
   */
  async searchTrips(filters: SearchTripsFilter) {
    const { items, totalCount } = await tripsRepository.searchTrips(filters);

    const formattedItems = await Promise.all(
      items.map(async (trip) => {
        const creator = await usersService.getPublicProfile(trip.userId).catch(() => null);
        return this.formatTripResponse(trip, creator);
      })
    );

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;

    return {
      items: formattedItems,
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
   * Get user's own trips
   */
  async getUserTrips(userId: string, page = 1, pageSize = 20) {
    const { items, totalCount } = await tripsRepository.findUserTrips(userId, page, pageSize);
    const creator = await usersService.getPublicProfile(userId).catch(() => null);

    return {
      items: items.map((trip) => this.formatTripResponse(trip, creator)),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  // --- Recurring Trips ---
  async createRecurringTrip(
    userId: string,
    data: {
      source: { name: string; coordinates: GeoPoint };
      destination: { name: string; coordinates: GeoPoint };
      daysOfWeek: number[];
      departureTime: string;
      transportType: TransportType;
      preferences?: TripPreferences;
    }
  ) {
    const source = this.normalizeLocation(data.source);
    const destination = this.normalizeLocation(data.destination);
    const now = new Date();

    const doc = await tripsRepository.createRecurringTrip({
      userId,
      source,
      destination,
      daysOfWeek: data.daysOfWeek,
      departureTime: data.departureTime,
      transportType: data.transportType,
      preferences: data.preferences || { genderPreference: 'any' },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      source: doc.source,
      destination: doc.destination,
      daysOfWeek: doc.daysOfWeek,
      departureTime: doc.departureTime,
      transportType: doc.transportType,
      preferences: doc.preferences,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async getUserRecurringTrips(userId: string) {
    const items = await tripsRepository.findUserRecurringTrips(userId);
    return items.map((doc) => ({
      id: doc._id.toHexString(),
      userId: doc.userId,
      source: doc.source,
      destination: doc.destination,
      daysOfWeek: doc.daysOfWeek,
      departureTime: doc.departureTime,
      transportType: doc.transportType,
      preferences: doc.preferences,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
    }));
  }
}

export const tripsService = new TripsService();
