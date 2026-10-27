// Typed Supabase schema for the backend. Mirrors the migrations in
// supabase/migrations (core schema + workflows). After changing the schema,
// update this file or regenerate it:
//   npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.types.ts

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';
export type OrganType =
  | 'kidney'
  | 'liver'
  | 'heart'
  | 'lung'
  | 'eyes'
  | 'bone_marrow';
export type Gender = 'male' | 'female' | 'other';
export type UserRole = 'user' | 'hospital_admin' | 'super_admin';
export type RequestType = 'blood' | 'organ';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus =
  | 'pending'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  'pending',
  'matched',
  'in_progress',
];
export type ResponseStatus = 'accepted' | 'declined';
export type DonationType =
  | 'whole_blood'
  | 'plasma'
  | 'platelets'
  | 'double_red_cells'
  | 'organ';
export type DocumentType =
  | 'id_proof'
  | 'medical_report'
  | 'blood_report'
  | 'donor_card'
  | 'other';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type CampStatus = 'scheduled' | 'cancelled' | 'completed';
export type NotificationType =
  | 'request_alert'
  | 'request_response'
  | 'request_update'
  | 'appointment'
  | 'document_review'
  | 'verification'
  | 'donation_verified'
  | 'camp'
  | 'announcement'
  | 'reminder'
  | 'moderation'
  | 'system';
export type OtpPurpose = 'verify_email' | 'reset_password';
export type GeneticDisorder =
  | 'none'
  | 'thalassemia'
  | 'sickle_cell_anemia'
  | 'cystic_fibrosis'
  | 'hemophilia'
  | 'other';
export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';
export type AccountStatus = 'active' | 'suspended';
export type ThemePreference = 'system' | 'light' | 'dark';
export type RegisteredAs = 'donor' | 'recipient';
export type AppointmentStatus =
  | 'requested'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type RequestEventType =
  | 'created'
  | 'verified'
  | 'donor_accepted'
  | 'donor_declined'
  | 'donor_assigned'
  | 'appointment_scheduled'
  | 'appointment_cancelled'
  | 'donation_completed'
  | 'completed'
  | 'cancelled'
  | 'flagged'
  | 'reopened';
export type ReportReason =
  | 'fake_request'
  | 'spam'
  | 'abuse'
  | 'fraud'
  | 'no_show'
  | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type Audience = 'all' | 'donors' | 'recipients';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  is_verified: boolean;
  role: UserRole;
  hospital_id: string | null;
  last_login_at: string | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_at: string | null;
  verified_by: string | null;
  status: AccountStatus;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type HospitalRow = {
  id: string;
  name: string;
  registration_no: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type HospitalStaffRow = {
  id: string;
  hospital_id: string;
  name: string;
  title: string;
  created_at: string;
};

export type AuthOtpRow = {
  id: string;
  user_id: string;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ProfileRow = {
  user_id: string;
  dob: string | null;
  gender: Gender | null;
  blood_group: BloodGroup | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  registered_as: RegisteredAs;
  avatar_path: string | null;
  associated_hospital_id: string | null;
  available_to_donate: boolean;
  share_contact: boolean;
  receive_notifications: boolean;
  existing_diseases: string | null;
  genetic_disorder: GeneticDisorder | null;
  genetic_disorder_other: string | null;
  had_surgery_last_5_years: boolean | null;
  allergies: string | null;
  medications: string | null;
  show_on_leaderboard: boolean;
  theme_preference: ThemePreference;
  eligibility_reminded_on: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganPledgeRow = {
  id: string;
  user_id: string;
  organ_type: OrganType;
  created_at: string;
};

export type DonationRequestRow = {
  id: string;
  requester_id: string;
  hospital_id: string | null;
  hospital_name: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: Gender | null;
  request_type: RequestType;
  blood_group: BloodGroup | null;
  organ_type: OrganType | null;
  units_required: number | null;
  priority: RequestPriority;
  status: RequestStatus;
  contact_phone: string;
  location_text: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  needed_by: string | null;
  notes: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  document_id: string | null;
  matched_at: string | null;
  completed_at: string | null;
  closed_by: string | null;
  close_reason: string | null;
  flagged: boolean;
  stale_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestResponseRow = {
  id: string;
  request_id: string;
  donor_id: string;
  status: ResponseStatus;
  message: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestEventRow = {
  id: string;
  request_id: string;
  actor_id: string | null;
  type: RequestEventType;
  message: string | null;
  created_at: string;
};

export type RequestAlertRow = {
  request_id: string;
  donor_id: string;
  score: number | null;
  created_at: string;
};

export type AppointmentRow = {
  id: string;
  donor_id: string;
  request_id: string | null;
  hospital_id: string | null;
  hospital_name: string;
  scheduled_at: string;
  location_text: string | null;
  instructions: string | null;
  donation_type: DonationType;
  status: AppointmentStatus;
  donor_note: string | null;
  created_by: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  donation_id: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RatingRow = {
  id: string;
  request_id: string;
  rater_id: string;
  donor_id: string | null;
  hospital_id: string | null;
  score: number;
  comment: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'request';
  target_user_id: string | null;
  target_request_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AnnouncementRow = {
  id: string;
  hospital_id: string | null;
  created_by: string | null;
  title: string;
  body: string;
  audience: Audience;
  city: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
};

export type DonationRow = {
  id: string;
  donor_id: string;
  hospital_id: string | null;
  hospital_name: string;
  donation_type: DonationType;
  blood_group: BloodGroup | null;
  units: number;
  donated_on: string;
  request_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  doc_type: DocumentType;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CampRow = {
  id: string;
  hospital_id: string | null;
  organizer_name: string;
  title: string;
  description: string | null;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: CampStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CampRegistrationRow = {
  camp_id: string;
  user_id: string;
  reminder_sent_at: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Json;
  read_at: string | null;
  created_at: string;
};

export type DonorStatsRow = {
  user_id: string;
  total_donations: number;
  verified_donations: number;
  last_donation_on: string | null;
  next_eligible_on: string | null;
  accepted_responses: number;
  points: number;
};

export type DonorRatingRow = {
  user_id: string;
  avg_rating: number | null;
  ratings_count: number;
};

export type OpenRequestRow = Pick<
  DonationRequestRow,
  | 'id'
  | 'requester_id'
  | 'hospital_id'
  | 'hospital_name'
  | 'patient_name'
  | 'patient_age'
  | 'patient_gender'
  | 'request_type'
  | 'blood_group'
  | 'organ_type'
  | 'units_required'
  | 'priority'
  | 'status'
  | 'contact_phone'
  | 'location_text'
  | 'city'
  | 'latitude'
  | 'longitude'
  | 'needed_by'
  | 'notes'
  | 'is_verified'
  | 'created_at'
> & {
  distance_km: number | null;
  my_response: ResponseStatus | null;
  accepted_count: number;
  can_donate: boolean;
};

export type DonorSearchRow = {
  user_id: string;
  name: string | null;
  blood_group: BloodGroup | null;
  organ_type: OrganType | null;
  city: string | null;
  hospital_name: string | null;
  phone: string | null;
  distance_km: number | null;
  last_donation_on: string | null;
  next_eligible_on: string | null;
  is_eligible: boolean;
  verified_donations: number;
  avg_rating: number | null;
  ratings_count: number;
};

export type MatchRow = {
  user_id: string;
  name: string | null;
  blood_group: BloodGroup | null;
  city: string | null;
  distance_km: number | null;
  score: number;
  is_eligible: boolean;
  verified_donations: number;
  avg_rating: number | null;
  receive_notifications: boolean;
  already_alerted: boolean;
  response: ResponseStatus | null;
};

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  city: string | null;
  blood_group: BloodGroup | null;
  verified_donations: number;
  points: number;
  is_me: boolean;
};

export type UpcomingCampRow = Omit<
  CampRow,
  'status' | 'created_by' | 'created_at' | 'updated_at'
> & {
  registered_count: number;
  is_registered: boolean;
  distance_km: number | null;
};

type GeoArgs = {
  p_lat?: number | null;
  p_lng?: number | null;
  p_radius_km?: number | null;
  p_limit?: number;
  p_offset?: number;
};

export type Database = {
  public: {
    Tables: {
      users: Table<UserRow, 'email'>;
      hospitals: Table<HospitalRow, 'name'>;
      hospital_staff: Table<HospitalStaffRow, 'hospital_id' | 'name' | 'title'>;
      auth_otps: Table<
        AuthOtpRow,
        'user_id' | 'purpose' | 'code_hash' | 'expires_at'
      >;
      refresh_tokens: Table<
        RefreshTokenRow,
        'user_id' | 'token_hash' | 'expires_at'
      >;
      profiles: Table<ProfileRow, 'user_id'>;
      organ_pledges: Table<OrganPledgeRow, 'user_id' | 'organ_type'>;
      donation_requests: Table<
        DonationRequestRow,
        | 'requester_id'
        | 'hospital_name'
        | 'patient_name'
        | 'request_type'
        | 'contact_phone'
        | 'location_text'
      >;
      request_responses: Table<
        RequestResponseRow,
        'request_id' | 'donor_id' | 'status'
      >;
      request_events: Table<RequestEventRow, 'request_id' | 'type'>;
      request_alerts: Table<RequestAlertRow, 'request_id' | 'donor_id'>;
      appointments: Table<
        AppointmentRow,
        'donor_id' | 'hospital_name' | 'scheduled_at'
      >;
      ratings: Table<RatingRow, 'request_id' | 'rater_id' | 'score'>;
      reports: Table<ReportRow, 'reporter_id' | 'target_type' | 'reason'>;
      announcements: Table<AnnouncementRow, 'title' | 'body' | 'ends_at'>;
      donations: Table<
        DonationRow,
        'donor_id' | 'hospital_name' | 'donation_type' | 'donated_on'
      >;
      documents: Table<
        DocumentRow,
        | 'user_id'
        | 'name'
        | 'doc_type'
        | 'storage_path'
        | 'mime_type'
        | 'size_bytes'
      >;
      camps: Table<
        CampRow,
        'organizer_name' | 'title' | 'address' | 'starts_at' | 'ends_at'
      >;
      camp_registrations: Table<CampRegistrationRow, 'camp_id' | 'user_id'>;
      notifications: Table<
        NotificationRow,
        'user_id' | 'type' | 'title' | 'body'
      >;
    };
    Views: {
      donor_stats: { Row: DonorStatsRow; Relationships: [] };
      donor_ratings: { Row: DonorRatingRow; Relationships: [] };
    };
    Functions: {
      list_open_requests: {
        Args: GeoArgs & {
          p_viewer: string;
          p_request_type?: RequestType | null;
          p_blood_group?: BloodGroup | null;
          p_organ_type?: OrganType | null;
          p_compatible_only?: boolean;
        };
        Returns: OpenRequestRow[];
      };
      search_donors: {
        Args: GeoArgs & {
          p_viewer: string;
          p_kind: RequestType;
          p_blood_group?: BloodGroup | null;
          p_organ_type?: OrganType | null;
          p_compatible?: boolean;
        };
        Returns: DonorSearchRow[];
      };
      list_upcoming_camps: {
        Args: GeoArgs & { p_viewer: string };
        Returns: UpcomingCampRow[];
      };
      match_donors: {
        Args: { p_request: string; p_radius_km?: number; p_limit?: number };
        Returns: MatchRow[];
      };
      users_near: {
        Args: {
          p_lat: number | null;
          p_lng: number | null;
          p_radius_km: number;
          p_city?: string | null;
        };
        Returns: { user_id: string }[];
      };
      leaderboard: {
        Args: {
          p_viewer: string;
          p_city?: string | null;
          p_since?: string | null;
          p_limit?: number;
        };
        Returns: LeaderboardRow[];
      };
      admin_analytics: {
        Args: {
          p_hospital?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_city?: string | null;
        };
        Returns: Json;
      };
      run_scheduled_reminders: {
        Args: Record<string, never>;
        Returns: Json;
      };
      broadcast_announcement: {
        Args: { p_announcement: string };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
