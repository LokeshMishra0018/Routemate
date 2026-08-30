/**
 * Core MongoDB Collection names defined in the RouteMate Master Specification
 */
export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'profiles',
  COLLEGES: 'colleges',
  VERIFICATION_REQUESTS: 'verificationRequests',
  TRIPS: 'trips',
  MATCHES: 'matches',
  CONNECTIONS: 'connections',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'groupMembers',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  BLOCKS: 'blocks',
  RECURRING_TRIPS: 'recurringTrips',
  ADMIN_ACTIONS: 'adminActions',
  BADGES: 'badges',
  USER_BADGES: 'userBadges',
  SESSIONS: 'sessions',
  EMERGENCY_CONTACTS: 'emergencyContacts',
  SOS_EVENTS: 'sosEvents',
  ACTIVITY_LOGS: 'activityLogs',
  SEARCH_LOGS: 'searchLogs',
  SYSTEM_SETTINGS: 'systemSettings',
  VISITOR_SESSIONS: 'visitorSessions',
  STUDENT_SESSIONS: 'studentSessions',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
