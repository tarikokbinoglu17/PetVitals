/**
 * Hand-written mirror of the schema in `supabase/migrations/0001_init.sql`.
 * Once a live Supabase project exists, replace this file by running:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'pet_owner' | 'veterinarian';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'pet_owner' | 'veterinarian';
          avatar_url?: string | null;
        };
        Update: Partial<{
          full_name: string | null;
          role: 'pet_owner' | 'veterinarian';
          avatar_url: string | null;
        }>;
        Relationships: [];
      };
      pets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          species: string;
          breed: string | null;
          gender: 'male' | 'female' | 'unknown';
          date_of_birth: string | null;
          weight_kg: number | null;
          microchip_id: string | null;
          photo_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          species: string;
          breed?: string | null;
          gender?: 'male' | 'female' | 'unknown';
          date_of_birth?: string | null;
          weight_kg?: number | null;
          microchip_id?: string | null;
          photo_url?: string | null;
          description?: string | null;
        };
        Update: Partial<{
          name: string;
          species: string;
          breed: string | null;
          gender: 'male' | 'female' | 'unknown';
          date_of_birth: string | null;
          weight_kg: number | null;
          microchip_id: string | null;
          photo_url: string | null;
          description: string | null;
        }>;
        Relationships: [];
      };
      vaccine_records: {
        Row: {
          id: string;
          pet_id: string;
          vaccine_name: string;
          vaccine_type: 'core' | 'non_core' | 'other';
          administered_date: string;
          next_due_date: string | null;
          repeat_interval_days: number | null;
          veterinarian: string | null;
          notes: string | null;
          attachment_url: string | null;
          notification_enabled: boolean;
          notification_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          pet_id: string;
          vaccine_name: string;
          vaccine_type?: 'core' | 'non_core' | 'other';
          administered_date: string;
          next_due_date?: string | null;
          repeat_interval_days?: number | null;
          veterinarian?: string | null;
          notes?: string | null;
          attachment_url?: string | null;
          notification_enabled?: boolean;
          notification_ids?: string[];
        };
        Update: Partial<{
          vaccine_name: string;
          vaccine_type: 'core' | 'non_core' | 'other';
          administered_date: string;
          next_due_date: string | null;
          repeat_interval_days: number | null;
          veterinarian: string | null;
          notes: string | null;
          attachment_url: string | null;
          notification_enabled: boolean;
          notification_ids: string[];
        }>;
        Relationships: [];
      };
      health_records: {
        Row: {
          id: string;
          pet_id: string;
          type: 'vet_visit' | 'treatment' | 'medication' | 'allergy' | 'other';
          title: string;
          description: string | null;
          record_date: string;
          veterinarian: string | null;
          attachment_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          pet_id: string;
          type: 'vet_visit' | 'treatment' | 'medication' | 'allergy' | 'other';
          title: string;
          description?: string | null;
          record_date: string;
          veterinarian?: string | null;
          attachment_url?: string | null;
        };
        Update: Partial<{
          type: 'vet_visit' | 'treatment' | 'medication' | 'allergy' | 'other';
          title: string;
          description: string | null;
          record_date: string;
          veterinarian: string | null;
          attachment_url: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
