import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import {
  ReportDocument,
  EmergencyContactDocument,
  SosEventDocument,
  ReportCategory,
  ReportStatus,
  SosStatus,
} from './safety.types.js';

export class SafetyRepository {
  private get reports() {
    return getDb().collection<ReportDocument>(COLLECTIONS.REPORTS);
  }

  private get emergencyContacts() {
    return getDb().collection<EmergencyContactDocument>(COLLECTIONS.EMERGENCY_CONTACTS);
  }

  private get sosEvents() {
    return getDb().collection<SosEventDocument>(COLLECTIONS.SOS_EVENTS);
  }

  // Reports
  async createReport(data: Omit<ReportDocument, '_id'>): Promise<ReportDocument> {
    const doc: ReportDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.reports.insertOne(doc);
    return doc;
  }

  async findReportById(id: string): Promise<ReportDocument | null> {
    try {
      return this.reports.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findReports(
    category?: ReportCategory,
    status?: ReportStatus,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ReportDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const [items, totalCount] = await Promise.all([
      this.reports.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.reports.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async updateReportStatus(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<ReportDocument | null> {
    const result = await this.reports.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          resolvedBy,
          resolutionNotes: resolutionNotes || null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    return result as ReportDocument | null;
  }

  // Emergency Contacts
  async createEmergencyContact(
    data: Omit<EmergencyContactDocument, '_id'>
  ): Promise<EmergencyContactDocument> {
    // If setting as primary, unset other primaries for this user
    if (data.isPrimary) {
      await this.emergencyContacts.updateMany({ userId: data.userId }, { $set: { isPrimary: false } });
    }

    const doc: EmergencyContactDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.emergencyContacts.insertOne(doc);
    return doc;
  }

  async findEmergencyContactsByUser(userId: string): Promise<EmergencyContactDocument[]> {
    return this.emergencyContacts.find({ userId }).sort({ isPrimary: -1, createdAt: 1 }).toArray();
  }

  async countEmergencyContacts(userId: string): Promise<number> {
    return this.emergencyContacts.countDocuments({ userId });
  }

  async deleteEmergencyContact(id: string, userId: string): Promise<boolean> {
    const res = await this.emergencyContacts.deleteOne({ _id: new ObjectId(id), userId });
    return res.deletedCount > 0;
  }

  // SOS Events
  async createSosEvent(data: Omit<SosEventDocument, '_id'>): Promise<SosEventDocument> {
    const doc: SosEventDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.sosEvents.insertOne(doc);
    return doc;
  }

  async findSosEvents(
    status?: SosStatus,
    page = 1,
    pageSize = 20
  ): Promise<{ items: SosEventDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [items, totalCount] = await Promise.all([
      this.sosEvents.find(filter).sort({ triggeredAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.sosEvents.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async resolveSosEvent(
    id: string,
    status: SosStatus,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<SosEventDocument | null> {
    const result = await this.sosEvents.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          resolvedBy,
          resolutionNotes: resolutionNotes || null,
          resolvedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    return result as SosEventDocument | null;
  }
}

export const safetyRepository = new SafetyRepository();
