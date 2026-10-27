import type {
  BloodGroup,
  DocumentType,
  DonationType,
  Gender,
  GeneticDisorder,
  OrganType,
  RequestPriority,
} from '../types/database.types';

export const BLOOD_GROUPS: readonly BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

export const ORGAN_TYPES: readonly OrganType[] = [
  'kidney',
  'liver',
  'heart',
  'lung',
  'eyes',
  'bone_marrow',
];

export const GENDERS: readonly Gender[] = ['male', 'female', 'other'];

export const GENETIC_DISORDERS: readonly GeneticDisorder[] = [
  'none',
  'thalassemia',
  'sickle_cell_anemia',
  'cystic_fibrosis',
  'hemophilia',
  'other',
];

export const REQUEST_PRIORITIES: readonly RequestPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

export const DONATION_TYPES: readonly DonationType[] = [
  'whole_blood',
  'plasma',
  'platelets',
  'double_red_cells',
  'organ',
];

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'id_proof',
  'medical_report',
  'blood_report',
  'donor_card',
  'other',
];

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  documents: 'documents',
} as const;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Badges are derived from donor_stats; thresholds live here so the API and the
// app agree on them.
export const BADGES = [
  { id: 'first_donation', label: 'First Donation', minVerified: 1 },
  { id: 'five_donations', label: '5 Donations', minVerified: 5 },
  { id: 'top_donor', label: 'Top Donor', minVerified: 10 },
  { id: 'community_hero', label: 'Community Hero', minAccepted: 3 },
] as const;

// Indian mobile numbers, optionally prefixed with +91.
export const PHONE_REGEX = /^(\+91[- ]?)?[6-9]\d{9}$/;
