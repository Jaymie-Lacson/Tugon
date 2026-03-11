export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string;
          fullName: string;
          phoneNumber: string;
          passwordHash: string | null;
          role: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";
          isPhoneVerified: boolean;
          is_verified: boolean;
          id_image_url: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          fullName: string;
          phoneNumber: string;
          passwordHash?: string | null;
          role: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";
          isPhoneVerified?: boolean;
          is_verified?: boolean;
          id_image_url?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          fullName?: string;
          phoneNumber?: string;
          passwordHash?: string | null;
          role?: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";
          isPhoneVerified?: boolean;
          is_verified?: boolean;
          id_image_url?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      CitizenReport: {
        Row: {
          id: string;
          citizenUserId: string;
          routedBarangayCode: string;
          latitude: number;
          longitude: number;
          type: string;
          status: string;
          location: string;
          barangay: string;
          district: string;
          description: string;
          severity: "low" | "medium" | "high" | "critical";
          affectedCount: string | null;
          submittedAt: string;
          updatedAt: string;
          hasPhotos: boolean;
          photoCount: number;
          hasAudio: boolean;
          assignedOfficer: string | null;
          assignedUnit: string | null;
          resolutionNote: string | null;
        };
        Insert: {
          id?: string;
          citizenUserId: string;
          routedBarangayCode: string;
          latitude: number;
          longitude: number;
          type: string;
          status: string;
          location: string;
          barangay: string;
          district: string;
          description: string;
          severity: "low" | "medium" | "high" | "critical";
          affectedCount?: string | null;
          submittedAt?: string;
          updatedAt?: string;
          hasPhotos?: boolean;
          photoCount?: number;
          hasAudio?: boolean;
          assignedOfficer?: string | null;
          assignedUnit?: string | null;
          resolutionNote?: string | null;
        };
        Update: {
          id?: string;
          citizenUserId?: string;
          routedBarangayCode?: string;
          latitude?: number;
          longitude?: number;
          type?: string;
          status?: string;
          location?: string;
          barangay?: string;
          district?: string;
          description?: string;
          severity?: "low" | "medium" | "high" | "critical";
          affectedCount?: string | null;
          submittedAt?: string;
          updatedAt?: string;
          hasPhotos?: boolean;
          photoCount?: number;
          hasAudio?: boolean;
          assignedOfficer?: string | null;
          assignedUnit?: string | null;
          resolutionNote?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "CitizenReport_citizenUserId_fkey";
            columns: ["citizenUserId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          is_verified: boolean;
          id_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          is_verified?: boolean;
          id_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_verified?: boolean;
          id_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          sender_profile_id: string;
          created_at: string;
          updated_at: string;
          type: string;
          status: string;
          description: string;
        };
        Insert: {
          id?: string;
          sender_profile_id: string;
          created_at?: string;
          updated_at?: string;
          type: string;
          status: string;
          description: string;
        };
        Update: {
          id?: string;
          sender_profile_id?: string;
          created_at?: string;
          updated_at?: string;
          type?: string;
          status?: string;
          description?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_sender_profile_id_fkey";
            columns: ["sender_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PublicSchema = Database["public"];
export type PublicTables = PublicSchema["Tables"];
export type TableRow<T extends keyof PublicTables> = PublicTables[T]["Row"];
