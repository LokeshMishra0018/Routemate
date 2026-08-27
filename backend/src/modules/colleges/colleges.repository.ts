import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { CollegeDocument } from './colleges.types.js';

export class CollegesRepository {
  private get collection() {
    return getDb().collection<CollegeDocument>(COLLECTIONS.COLLEGES);
  }

  async findByDomain(domain: string): Promise<CollegeDocument | null> {
    const normalized = domain.toLowerCase().trim();
    return this.collection.findOne({ domain: normalized });
  }

  async findById(id: string): Promise<CollegeDocument | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findAllActive(): Promise<CollegeDocument[]> {
    return this.collection.find({ isActive: true }).sort({ name: 1 }).toArray();
  }
}

export const collegesRepository = new CollegesRepository();
