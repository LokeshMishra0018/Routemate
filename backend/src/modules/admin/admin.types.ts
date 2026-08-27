import { ObjectId } from 'mongodb';

export interface AdminActionDocument {
  _id: ObjectId;
  actorUserId: string;
  actionType:
    | 'verification_approved'
    | 'verification_rejected'
    | 'user_suspended'
    | 'user_unsuspended'
    | 'role_changed';
  targetUserId: string | null;
  targetResourceId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ReviewVerificationInput {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}
