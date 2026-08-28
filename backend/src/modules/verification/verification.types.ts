import { ObjectId } from 'mongodb';

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequestDocument {
  _id: ObjectId;
  userId: string;
  collegeId: string;
  documentStorageKey: string;
  documentMimeType: string;
  documentSize: number;
  documentBase64?: string | null;
  status: VerificationRequestStatus;
  reviewerId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationResponseDto {
  id: string;
  userId: string;
  collegeId: string;
  status: VerificationRequestStatus;
  documentMimeType: string;
  documentSize: number;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
