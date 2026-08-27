import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { UserDocument, ProfileDocument, SessionDocument } from './users.types.js';

export class UsersRepository {
  private get usersCollection() {
    return getDb().collection<UserDocument>(COLLECTIONS.USERS);
  }

  private get profilesCollection() {
    return getDb().collection<ProfileDocument>(COLLECTIONS.PROFILES);
  }

  private get sessionsCollection() {
    return getDb().collection<SessionDocument>(COLLECTIONS.SESSIONS);
  }

  // --- Users ---
  async findUserById(id: string): Promise<UserDocument | null> {
    try {
      return this.usersCollection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findUserByEmailNormalized(emailNormalized: string): Promise<UserDocument | null> {
    return this.usersCollection.findOne({ emailNormalized });
  }

  async findUserByVerificationTokenHash(hash: string): Promise<UserDocument | null> {
    return this.usersCollection.findOne({
      emailVerificationTokenHash: hash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
  }

  async findUserByPasswordResetTokenHash(hash: string): Promise<UserDocument | null> {
    return this.usersCollection.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpiresAt: { $gt: new Date() },
    });
  }

  async createUser(data: Omit<UserDocument, '_id'>): Promise<UserDocument> {
    const res = await this.usersCollection.insertOne(data as UserDocument);
    return { ...data, _id: res.insertedId };
  }

  async updateUser(id: string, update: Partial<UserDocument>): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } }
    );
  }

  // --- Profiles ---
  async findProfileByUserId(userId: string): Promise<ProfileDocument | null> {
    return this.profilesCollection.findOne({ userId });
  }

  async createProfile(data: Omit<ProfileDocument, '_id'>): Promise<ProfileDocument> {
    const res = await this.profilesCollection.insertOne(data as ProfileDocument);
    return { ...data, _id: res.insertedId };
  }

  async updateProfile(userId: string, update: Partial<ProfileDocument>): Promise<void> {
    await this.profilesCollection.updateOne(
      { userId },
      { $set: { ...update, updatedAt: new Date() } }
    );
  }

  // --- Sessions ---
  async createSession(data: Omit<SessionDocument, '_id'>): Promise<SessionDocument> {
    const res = await this.sessionsCollection.insertOne(data as SessionDocument);
    return { ...data, _id: res.insertedId };
  }

  async findActiveSessionByTokenHash(refreshTokenHash: string): Promise<SessionDocument | null> {
    return this.sessionsCollection.findOne({
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async revokeSession(sessionId: ObjectId): Promise<void> {
    await this.sessionsCollection.updateOne(
      { _id: sessionId },
      { $set: { revokedAt: new Date() } }
    );
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionsCollection.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

export const usersRepository = new UsersRepository();
