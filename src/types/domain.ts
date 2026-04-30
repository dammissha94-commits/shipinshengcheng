export type Relation =
  | 'self'
  | 'father'
  | 'mother'
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'grandfather_paternal'
  | 'grandmother_paternal'
  | 'grandfather_maternal'
  | 'grandmother_maternal';

export type ClaimStatus = 'unclaimed' | 'claimed' | 'disputed';
export type Visibility = 'private' | 'family' | 'public';
export type Gender = 'male' | 'female' | 'unknown';
export type MeetingType = 'notice' | 'vote' | 'event' | 'memorial_day';
export type MeetingStatus = 'open' | 'closed' | 'archived';
export type MeetingOpinionStance = 'agree' | 'disagree' | 'neutral' | 'suggestion' | 'question';
export type MeetingOpinionStatus = 'active' | 'hidden' | 'archived';
export type MeetingOpinionVisibility = 'private' | 'family';
export type ContentStatus = 'active' | 'archived' | 'hidden';
export type FamilyOutputType =
  | 'three_generation_tree'
  | 'family_memory_book'
  | 'family_story_book'
  | 'family_yearbook';
export type FamilyOutputStatus = 'draft' | 'preview_ready' | 'archived';
export type CalendarEventType = 'birthday' | 'anniversary' | 'family_gathering' | 'family_task';
export type CalendarEventStatus = 'active' | 'archived';
export type CalendarRecurrence = 'none' | 'yearly' | 'monthly';
export type BirthDatePrecision = 'unknown' | 'year_only' | 'month_day' | 'full_date';
export type CalendarEventSourceType = 'manual' | 'person_birthday' | 'family_custom';
export type FamilyRole = 'owner' | 'family_admin' | 'memory_admin' | 'member' | 'viewer';
export type JoinStatus = 'pending' | 'active' | 'removed';
export type FamilyType = 'small_family' | 'branch_family' | 'organization';
export type FamilyStatus = 'active' | 'archived' | 'disabled';
export type LivingStatus = 'alive' | 'deceased' | 'unknown';
export type RelationType =
  | 'parent_of'
  | 'child_of'
  | 'spouse_of'
  | 'sibling_of'
  | 'grandparent_of';
export type RelationStatus = 'active' | 'pending' | 'disputed' | 'removed';
export type InviteType = 'join_family' | 'claim_person';
export type InviteStatus = 'pending' | 'claimed' | 'expired' | 'revoked';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  elder_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilySpace {
  id: string;
  surname: string;
  name: string;
  display_name: string;
  founder_user_id: string | null;
  family_type: FamilyType;
  visibility: Visibility;
  status: FamilyStatus;
  created_at: string;
  updated_at: string;
  /**
   * MVP local-storage compatibility fields.
   * New Supabase reads should prefer snake_case fields above.
   */
  displayName: string;
  ownerName: string;
  createdAt: string;
}

export interface FamilyMembership {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  join_status: JoinStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonProfile {
  id: string;
  family_id: string;
  bound_user_id: string | null;
  surname: string | null;
  given_name: string | null;
  display_name: string;
  gender: Gender | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_date_precision: BirthDatePrecision;
  death_year: number | null;
  living_status: LivingStatus;
  claim_status: ClaimStatus;
  visibility: Visibility;
  bio: string | null;
  portrait_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonRelation {
  id: string;
  family_id: string;
  from_person_id: string;
  to_person_id: string;
  relation_type: RelationType;
  is_primary: boolean;
  status: RelationStatus;
  created_by: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteToken {
  id: string;
  family_id: string;
  inviter_user_id: string | null;
  invitee_person_id: string | null;
  token: string;
  invite_type: InviteType;
  status: InviteStatus;
  expires_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionLog {
  id: string;
  family_id: string;
  actor_user_id: string | null;
  target_type: string;
  target_id: string | null;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FamilyOutput {
  id: string;
  family_id: string;
  creator_user_id: string | null;
  output_type: FamilyOutputType;
  title: string;
  description: string | null;
  status: FamilyOutputStatus;
  preview_data: Record<string, unknown>;
  generated_url: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface FamilyCalendarEvent {
  id: string;
  family_id: string;
  creator_user_id: string | null;
  related_person_id: string | null;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
  event_date: string;
  recurrence: CalendarRecurrence;
  remind_d7: boolean;
  remind_d1: boolean;
  remind_day: boolean;
  visibility: Visibility;
  status: CalendarEventStatus;
  source_type: CalendarEventSourceType;
  source_person_id: string | null;
  source_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  familyId: string;
  name: string;
  relation: Relation;
  gender: Gender;
  birthYear?: number;
  phone?: string;
  claimStatus: ClaimStatus;
  visibility: Visibility;
}

export interface Story {
  id: string;
  familyId: string;
  title: string;
  relatedPersonIds: string[];
  year?: number;
  content: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  familyId: string;
  type: MeetingType;
  title: string;
  content: string;
  status: MeetingStatus;
  createdAt: string;
}

export interface FamilyStory {
  id: string;
  family_id: string;
  author_user_id: string | null;
  title: string;
  content: string | null;
  story_year: number | null;
  related_person_ids: string[];
  visibility: Visibility;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface FamilyPhoto {
  id: string;
  family_id: string;
  uploader_user_id: string | null;
  title: string;
  description: string | null;
  photo_year: number | null;
  image_url: string | null;
  related_person_ids: string[];
  visibility: Visibility;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface FamilyMeeting {
  id: string;
  family_id: string;
  creator_user_id: string | null;
  meeting_type: MeetingType;
  title: string;
  content: string | null;
  event_date: string | null;
  status: MeetingStatus;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface FamilyMeetingVote {
  id: string;
  meeting_id: string;
  family_id: string;
  voter_user_id: string;
  option_text: string;
  created_at: string;
}

export interface FamilyMeetingOpinion {
  id: string;
  family_id: string;
  meeting_id: string;
  author_user_id: string | null;
  stance: MeetingOpinionStance;
  content: string;
  status: MeetingOpinionStatus;
  visibility: MeetingOpinionVisibility;
  created_at: string;
  updated_at: string;
}

export type FamilyStoryRecord = FamilyStory;
export type FamilyPhotoRecord = FamilyPhoto;
export type FamilyMeetingRecord = FamilyMeeting;
export type FamilyCalendarEventRecord = FamilyCalendarEvent;

export function getRelationLabel(relation: Relation, gender?: Gender): string {
  switch (relation) {
    case 'self': return '本人';
    case 'father': return '父亲';
    case 'mother': return '母亲';
    case 'spouse':
      if (gender === 'female') return '妻子';
      if (gender === 'male') return '丈夫';
      return '配偶';
    case 'child':
      if (gender === 'female') return '女儿';
      if (gender === 'male') return '儿子';
      return '子女';
    case 'sibling':
      if (gender === 'female') return '姐妹';
      if (gender === 'male') return '兄弟';
      return '兄弟姐妹';
    case 'grandfather_paternal': return '爷爷';
    case 'grandmother_paternal': return '奶奶';
    case 'grandfather_maternal': return '外公';
    case 'grandmother_maternal': return '外婆';
    default: return '家人';
  }
}

export const RELATION_OPTIONS: { value: Relation; label: string }[] = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'spouse', label: '配偶' },
  { value: 'child', label: '子女' },
  { value: 'sibling', label: '兄弟姐妹' },
  { value: 'grandfather_paternal', label: '爷爷' },
  { value: 'grandmother_paternal', label: '奶奶' },
  { value: 'grandfather_maternal', label: '外公' },
  { value: 'grandmother_maternal', label: '外婆' },
];
