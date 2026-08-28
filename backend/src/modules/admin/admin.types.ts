import { ObjectId } from 'mongodb';

export interface AdminActionDocument {
  _id: ObjectId;
  actorUserId: string;
  actionType:
    | 'verification_approved'
    | 'verification_rejected'
    | 'user_suspended'
    | 'user_unsuspended'
    | 'role_changed'
    | 'report_resolved'
    | 'sos_resolved'
    | 'trip_cancelled_by_admin'
    | 'trip_purged_by_admin'
    | 'trip_visibility_toggled'
    | 'trip_changes_requested'
    | 'trip_force_completed';
  targetUserId: string | null;
  targetResourceId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ReviewVerificationInput {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}
