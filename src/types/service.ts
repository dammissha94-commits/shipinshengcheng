import type {
  BirthDatePrecision,
  CalendarEventStatus,
  CalendarEventType,
  CalendarRecurrence,
  ClaimStatus,
  FamilyCalendarEvent,
  FamilyMembership,
  FamilyRole,
  FamilySpace,
  FamilyStatus,
  FamilyType,
  Gender,
  InviteToken,
  LivingStatus,
  FamilyMeeting,
  FamilyOutput,
  FamilyOutputType,
  FamilyPhoto,
  FamilyStory,
  MeetingType,
  PersonProfile,
  PersonRelation,
  RelationType,
  Visibility,
} from './domain';

export interface CreateFamilySpaceInput {
  surname: string;
  ownerName: string;
  selfGender: Gender;
  selfBirthYear?: number | null;
  name?: string;
  displayName?: string;
  familyType?: FamilyType;
  visibility?: Visibility;
}

export interface UpdateFamilySpaceInput {
  surname?: string;
  name?: string;
  displayName?: string;
  familyType?: FamilyType;
  visibility?: Visibility;
  status?: FamilyStatus;
}

export interface CreatePersonProfileInput {
  familyId: string;
  surname?: string | null;
  givenName?: string | null;
  displayName: string;
  gender?: Gender | null;
  birthYear?: number | null;
  deathYear?: number | null;
  livingStatus?: LivingStatus;
  visibility?: Visibility;
  bio?: string | null;
  portraitUrl?: string | null;
}

export interface CreatePersonRelationInput {
  familyId: string;
  fromPersonId: string;
  toPersonId: string;
  relationType: RelationType;
  isPrimary?: boolean;
}

export interface CreateInviteTokenInput {
  familyId: string;
  inviteePersonId: string;
  inviteType?: 'join_family' | 'claim_person';
  expiresAt?: string | null;
}

export type UserFamilyRole = FamilyRole | null;

export interface InviteWithPerson {
  invite: InviteToken;
  family: FamilySpace;
  person: PersonProfile;
}

export interface ClaimInviteResult extends InviteWithPerson {
  membership?: FamilyMembership | null;
}

export interface FamilyMemberStats {
  totalPersons: number;
  claimedPersons: number;
  unclaimedPersons: number;
  alivePersons: number;
  deceasedPersons: number;
}

export interface UpdatePersonProfileInput {
  surname?: string | null;
  givenName?: string | null;
  displayName?: string;
  gender?: Gender | null;
  birthYear?: number | null;
  deathYear?: number | null;
  livingStatus?: LivingStatus;
  visibility?: Visibility;
  bio?: string | null;
  portraitUrl?: string | null;
}

export interface UpdatePersonBirthdateInput {
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  birthDatePrecision?: BirthDatePrecision;
}

export interface SyncPersonBirthdayEventInput {
  personId: string;
}

export interface UpdateFamilySettingsInput {
  displayName?: string;
  visibility?: Visibility;
}

export interface PersonRelationSummary {
  relation: PersonRelation;
  otherPerson: PersonProfile | null;
  label: string;
}

export interface MemberListItem {
  profile: PersonProfile;
  relationLabel: string;
  membership: FamilyMembership | null;
}

export interface ListFamilyMembersFilter {
  claimStatus?: ClaimStatus;
  livingStatus?: LivingStatus;
}

export interface CreateFamilyStoryInput {
  familyId: string;
  title: string;
  content?: string | null;
  storyYear?: number | null;
  relatedPersonIds?: string[];
  visibility?: Visibility;
}

export interface UpdateFamilyStoryInput {
  title?: string;
  content?: string | null;
  storyYear?: number | null;
  relatedPersonIds?: string[];
  visibility?: Visibility;
  status?: FamilyStory['status'];
}

export interface CreateFamilyPhotoInput {
  familyId: string;
  title: string;
  description?: string | null;
  photoYear?: number | null;
  imageUrl?: string | null;
  relatedPersonIds?: string[];
  visibility?: Visibility;
}

export interface UpdateFamilyPhotoInput {
  title?: string;
  description?: string | null;
  photoYear?: number | null;
  imageUrl?: string | null;
  relatedPersonIds?: string[];
  visibility?: Visibility;
  status?: FamilyPhoto['status'];
}

export interface CreateFamilyMeetingInput {
  familyId: string;
  meetingType: MeetingType;
  title: string;
  content?: string | null;
  eventDate?: string | null;
  visibility?: Visibility;
}

export interface UpdateFamilyMeetingInput {
  meetingType?: MeetingType;
  title?: string;
  content?: string | null;
  eventDate?: string | null;
  status?: FamilyMeeting['status'];
  visibility?: Visibility;
}

export interface PreviewPersonItem {
  id: string;
  name: string;
  relation: string;
  claimStatus?: ClaimStatus;
  livingStatus?: LivingStatus;
}

export interface ThreeGenerationTreePreview {
  familyId: string;
  familyName: string;
  surname: string;
  totalPersons: number;
  claimedPersons: number;
  unclaimedPersons: number;
  alivePersons: number;
  deceasedPersons: number;
  relationCount: number;
  generations: {
    grandparents: PreviewPersonItem[];
    parents: PreviewPersonItem[];
    selfAndSiblings: PreviewPersonItem[];
    children: PreviewPersonItem[];
  };
  generatedAt: string;
}

export interface FamilyMemoryBookPreview {
  familyId: string;
  familyName: string;
  surname: string;
  storyCount: number;
  photoCount: number;
  recentStories: { id: string; title: string; year: number | null }[];
  recentPhotos: { id: string; title: string; year: number | null }[];
  generatedAt: string;
}

export interface FamilyStoryBookPreview {
  familyId: string;
  familyName: string;
  surname: string;
  storyCount: number;
  storyTitles: string[];
  generatedAt: string;
}

export interface FamilyYearbookPreview {
  familyId: string;
  familyName: string;
  surname: string;
  year: number;
  personCount: number;
  storyCount: number;
  photoCount: number;
  generatedAt: string;
}

export type FamilyOutputPreviewData =
  | ThreeGenerationTreePreview
  | FamilyMemoryBookPreview
  | FamilyStoryBookPreview
  | FamilyYearbookPreview
  | Record<string, unknown>;

export interface CreateFamilyOutputInput {
  familyId: string;
  outputType: FamilyOutputType;
  title: string;
  description?: string | null;
  status?: FamilyOutput['status'];
  previewData?: FamilyOutputPreviewData;
  generatedUrl?: string | null;
  visibility?: Visibility;
}

export interface UpdateFamilyOutputInput {
  title?: string;
  description?: string | null;
  visibility?: Visibility;
  previewData?: FamilyOutputPreviewData;
  status?: FamilyOutput['status'];
}

export interface CreateFamilyCalendarEventInput {
  familyId: string;
  eventType: CalendarEventType;
  title: string;
  description?: string | null;
  eventDate: string;
  recurrence?: CalendarRecurrence;
  remindD7?: boolean;
  remindD1?: boolean;
  remindDay?: boolean;
  relatedPersonId?: string | null;
  visibility?: Visibility;
  sourceType?: FamilyCalendarEvent['source_type'];
  sourcePersonId?: string | null;
  sourceKey?: string | null;
}

export interface UpdateFamilyCalendarEventInput {
  eventType?: CalendarEventType;
  title?: string;
  description?: string | null;
  eventDate?: string;
  recurrence?: CalendarRecurrence;
  remindD7?: boolean;
  remindD1?: boolean;
  remindDay?: boolean;
  relatedPersonId?: string | null;
  visibility?: Visibility;
  status?: CalendarEventStatus;
  sourceType?: FamilyCalendarEvent['source_type'];
  sourcePersonId?: string | null;
  sourceKey?: string | null;
}

export interface FamilyReminderItem {
  event: FamilyCalendarEvent;
  typeLabel: string;
  badge: string;
  daysUntil: number;
  isAutoBirthday: boolean;
}

export interface FamilyReminderSummary {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  upcoming: FamilyReminderItem[];
}

export interface UpcomingFamilyEventsResult {
  familyId: string;
  daysAhead: number;
  events: FamilyReminderItem[];
}

export type FamilyStoryItem = FamilyStory;
export type FamilyPhotoItem = FamilyPhoto;
export type FamilyMeetingItem = FamilyMeeting;
export type FamilyOutputItem = FamilyOutput;
export type FamilyCalendarEventItem = FamilyCalendarEvent;
