// Typed Supabase schema used by SupabaseService.
// Hand-written from the columns this backend uses. Once the Supabase CLI is linked,
// regenerate it from the real database instead:
//   npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.types.ts

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: Table<
        {
          id: string;
          name: string | null;
          email: string;
          password_hash: string | null;
          is_verified: boolean | null;
          verification_otp_hash: string | null;
          verification_expires_at: string | null;
          created_at: string | null;
        },
        'email'
      >;
      initial_profile_data: Table<
        {
          user_id: string;
          full_name: string;
          dob: string;
          gender: string;
          blood_group: string;
          phone: string;
          email: string;
          address: string;
          created_at: string;
        },
        | 'user_id'
        | 'full_name'
        | 'dob'
        | 'gender'
        | 'blood_group'
        | 'phone'
        | 'email'
        | 'address'
      >;
      user_stats: Table<{
        user_id: string;
        donations: number | null;
        points: number | null;
      }>;
      blood_requests: Table<{
        id: string;
        blood_type: string;
        hospital: string;
        location: string;
        units: number;
        urgent: boolean;
        status: string;
        created_at: string;
        latitude: number | null;
        longitude: number | null;
      }>;
      blood_camps: Table<{
        id: string;
        title: string;
        location: string;
        camp_date: string;
        start_time: string;
        end_time: string;
        status: string;
      }>;
      blood_donors: Table<{
        id: string;
        user_id: string;
        blood_type: string;
        hospital_name: string;
        location: string;
        units_available: number;
        status: string;
        created_at: string;
      }>;
      organ_donors: Table<{
        id: string;
        user_id: string;
        organ_type: string;
        hospital_name: string;
        location: string;
        status: string;
        created_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
