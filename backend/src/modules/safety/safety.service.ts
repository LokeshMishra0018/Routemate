import { safetyRepository } from './safety.repository.js';
import { usersService } from '../users/users.service.js';
import { getSocketIO } from '../../lib/socket.js';
import {
  ReportDocument,
  EmergencyContactDocument,
  SosEventDocument,
  ReportResponseDto,
  EmergencyContactResponseDto,
  SosEventResponseDto,
  ReportCategory,
} from './safety.types.js';
import { GeoPoint } from '../trips/trips.types.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export interface FileReportInput {
  reporterId: string;
  reportedUserId?: string;
  tripId?: string;
  category: ReportCategory;
  reason: string;
  evidenceUrls?: string[];
}

export interface AddEmergencyContactInput {
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}

export interface TriggerSosInput {
  userId: string;
  tripId?: string;
  location?: GeoPoint;
}

export class SafetyService {
  private async formatReportDto(doc: ReportDocument): Promise<ReportResponseDto> {
    const [reporter, reportedUser] = await Promise.all([
      usersService.getPublicProfile(doc.reporterId).catch(() => null),
      doc.reportedUserId ? usersService.getPublicProfile(doc.reportedUserId).catch(() => null) : null,
    ]);

    return {
      id: doc._id.toHexString(),
      reporterId: doc.reporterId,
      reportedUserId: doc.reportedUserId || null,
      tripId: doc.tripId || null,
      category: doc.category,
      reason: doc.reason,
      evidenceUrls: doc.evidenceUrls || null,
      status: doc.status,
      resolutionNotes: doc.resolutionNotes || null,
      resolvedBy: doc.resolvedBy || null,
      resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : null,
      reporter,
      reportedUser,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private formatEmergencyContactDto(doc: EmergencyContactDocument): EmergencyContactResponseDto {
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      name: doc.name,
      phone: doc.phone,
      relationship: doc.relationship,
      isPrimary: doc.isPrimary,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async formatSosEventDto(doc: SosEventDocument): Promise<SosEventResponseDto> {
    const user = await usersService.getPublicProfile(doc.userId).catch(() => null);

    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      tripId: doc.tripId || null,
      location: doc.location || null,
      status: doc.status,
      triggeredAt: doc.triggeredAt.toISOString(),
      resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : null,
      user,
    };
  }

  /**
   * File a safety report
   */
  async fileReport(input: FileReportInput): Promise<ReportResponseDto> {
    const doc = await safetyRepository.createReport({
      reporterId: input.reporterId,
      reportedUserId: input.reportedUserId || null,
      tripId: input.tripId || null,
      category: input.category,
      reason: input.reason,
      evidenceUrls: input.evidenceUrls || null,
      status: 'pending',
      resolutionNotes: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.formatReportDto(doc);
  }

  /**
   * Add emergency contact (maximum 5 contacts)
   */
  async addEmergencyContact(input: AddEmergencyContactInput): Promise<EmergencyContactResponseDto> {
    const count = await safetyRepository.countEmergencyContacts(input.userId);
    if (count >= 5) {
      throw new BadRequestError('You cannot add more than 5 emergency contacts');
    }

    // If first contact, automatically mark as primary
    const isPrimary = count === 0 ? true : !!input.isPrimary;

    const doc = await safetyRepository.createEmergencyContact({
      userId: input.userId,
      name: input.name,
      phone: input.phone,
      relationship: input.relationship,
      isPrimary,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.formatEmergencyContactDto(doc);
  }

  /**
   * List emergency contacts for user
   */
  async listEmergencyContacts(userId: string): Promise<EmergencyContactResponseDto[]> {
    const docs = await safetyRepository.findEmergencyContactsByUser(userId);
    return docs.map((d) => this.formatEmergencyContactDto(d));
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(userId: string, contactId: string): Promise<void> {
    const deleted = await safetyRepository.deleteEmergencyContact(contactId, userId);
    if (!deleted) {
      throw new NotFoundError('Emergency contact not found');
    }
  }

  /**
   * Trigger emergency SOS alert
   */
  async triggerSos(input: TriggerSosInput): Promise<SosEventResponseDto> {
    const [userProfile, contacts] = await Promise.all([
      usersService.getPublicProfile(input.userId).catch(() => null),
      safetyRepository.findEmergencyContactsByUser(input.userId),
    ]);

    const doc = await safetyRepository.createSosEvent({
      userId: input.userId,
      tripId: input.tripId || null,
      location: input.location || null,
      status: 'active',
      triggeredAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNotes: null,
    });

    const dto = await this.formatSosEventDto(doc);

    // Broadcast high priority SOS to moderators/admins via Socket.IO
    const io = getSocketIO();
    if (io) {
      io.to('admin').emit('sos:alert', {
        sosId: dto.id,
        user: userProfile,
        location: input.location,
        triggeredAt: dto.triggeredAt,
      });
    }

    // Mock Dispatch emergency notifications to user's contacts
    for (const c of contacts) {
      // In production, integrate SMS / Twilio Gateway
      // Log emergency mock notification
      console.log(`[EMERGENCY_SOS][SMS] To: ${c.name} (${c.phone}) | Alert: ${userProfile?.fullName || 'User'} triggered an emergency SOS.`);
    }

    return dto;
  }
}

export const safetyService = new SafetyService();
