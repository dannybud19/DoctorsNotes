/**
 * Typed shape of the Postgres schema (see supabase/migrations). Hand-authored for the scaffold;
 * once the DB is live, regenerate with `supabase gen types typescript` to replace this file.
 * Every table carries `patient_id` — RLS keys off it (AGENTS.md §1.5).
 */
type Timestamp = string;

interface Table<Row, Insert = Row, Update = Partial<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      members: Table<{ user_id: string; patient_id: string; role: string; created_at: Timestamp }>;
      patients: Table<{ id: string; display_name: string; created_at: Timestamp }>;
      documents: Table<{
        id: string;
        patient_id: string;
        storage_path: string;
        page_count: number | null;
        captured_at: Timestamp;
      }>;
      recordings: Table<{
        id: string;
        patient_id: string;
        storage_path: string;
        duration_ms: number | null;
        captured_at: Timestamp;
      }>;
      claims: Table<{
        id: string;
        patient_id: string;
        category: string;
        subject: string;
        verbatim_text: string;
        value: string;
        source: Json;
        observed_at: Timestamp;
        created_at: Timestamp;
      }>;
      claim_groups: Table<{
        id: string;
        patient_id: string;
        category: string;
        subject: string;
        status: string;
        computed_at: Timestamp;
      }>;
      confirmations: Table<{
        id: string;
        patient_id: string;
        category: string;
        subject: string;
        confirmed_value: string;
        from_claim_id: string;
        confirmed_at: Timestamp;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
