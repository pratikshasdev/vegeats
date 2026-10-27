// Generated from the Supabase schema (project vegeats). Regenerate after migrations:
//   npx supabase gen types typescript --project-id vvufwgsulrdkpmrcmjtv > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      dishes: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          photo_url: string | null
          price_cents: number | null
          restaurant_id: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          price_cents?: number | null
          restaurant_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          price_cents?: number | null
          restaurant_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          dish_id: string | null
          id: string
          kind: Database["public"]["Enums"]["photo_kind"]
          restaurant_id: string
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["photo_kind"]
          restaurant_id: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["photo_kind"]
          restaurant_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          diet_preferences: string[]
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          diet_preferences?: string[]
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          diet_preferences?: string[]
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address_line: string
          city: string
          country: string
          cover_photo_url: string | null
          created_at: string
          created_by: string | null
          cuisines: string[]
          description: string | null
          diet_level: Database["public"]["Enums"]["diet_level"]
          external_rating: number | null
          external_rating_count: number | null
          google_place_id: string | null
          hours: Json | null
          id: string
          is_permanently_closed: boolean
          location: unknown
          name: string
          phone: string | null
          postal_code: string | null
          price_level: number | null
          rating_avg: number
          rating_count: number
          region: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          timezone: string
          updated_at: string
          website: string | null
          yelp_id: string | null
        }
        Insert: {
          address_line: string
          city: string
          country?: string
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          cuisines?: string[]
          description?: string | null
          diet_level?: Database["public"]["Enums"]["diet_level"]
          external_rating?: number | null
          external_rating_count?: number | null
          google_place_id?: string | null
          hours?: Json | null
          id?: string
          is_permanently_closed?: boolean
          location: unknown
          name: string
          phone?: string | null
          postal_code?: string | null
          price_level?: number | null
          rating_avg?: number
          rating_count?: number
          region?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          website?: string | null
          yelp_id?: string | null
        }
        Update: {
          address_line?: string
          city?: string
          country?: string
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          cuisines?: string[]
          description?: string | null
          diet_level?: Database["public"]["Enums"]["diet_level"]
          external_rating?: number | null
          external_rating_count?: number | null
          google_place_id?: string | null
          hours?: Json | null
          id?: string
          is_permanently_closed?: boolean
          location?: unknown
          name?: string
          phone?: string | null
          postal_code?: string | null
          price_level?: number | null
          rating_avg?: number
          rating_count?: number
          region?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          website?: string | null
          yelp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          rating: number
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: Database["public"]["Enums"]["tag_category"]
          description: string | null
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["tag_category"]
          description?: string | null
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["tag_category"]
          description?: string | null
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      import_restaurants: {
        Args: { p_rows: Json }
        Returns: {
          inserted: number
          updated: number
        }[]
      }
      lat: {
        Args: { r: Database["public"]["Tables"]["restaurants"]["Row"] }
        Returns: number
      }
      lng: {
        Args: { r: Database["public"]["Tables"]["restaurants"]["Row"] }
        Returns: number
      }
      search_restaurants: {
        Args: {
          p_diet_levels?: Database["public"]["Enums"]["diet_level"][]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_max_lat?: number
          p_max_lng?: number
          p_min_lat?: number
          p_min_lng?: number
          p_offset?: number
          p_query?: string
          p_radius_m?: number
          p_tags?: string[]
        }
        Returns: {
          address_line: string
          city: string
          cover_photo_url: string
          cuisines: string[]
          description: string
          diet_level: Database["public"]["Enums"]["diet_level"]
          distance_m: number
          external_rating: number
          external_rating_count: number
          hours: Json
          id: string
          lat: number
          lng: number
          name: string
          postal_code: string
          price_level: number
          rating_avg: number
          rating_count: number
          region: string
          tags: string[]
          timezone: string
        }[]
      }
      submit_restaurant: {
        Args: {
          p_address_line: string
          p_city: string
          p_cuisines?: string[]
          p_description?: string
          p_diet_level: Database["public"]["Enums"]["diet_level"]
          p_lat: number
          p_lng: number
          p_name: string
          p_phone?: string
          p_postal_code: string
          p_region: string
          p_tags?: string[]
          p_website?: string
        }
        Returns: string
      }
    }
    Enums: {
      content_status: "pending" | "approved" | "rejected"
      diet_level: "fully_vegan" | "vegetarian" | "veg_friendly"
      photo_kind: "menu" | "dish" | "place"
      report_reason:
        | "not_vegan"
        | "not_vegetarian"
        | "allergen_info_wrong"
        | "wrong_hours"
        | "permanently_closed"
        | "wrong_location"
        | "duplicate"
        | "inappropriate"
        | "other"
      report_status: "open" | "resolved" | "dismissed"
      report_target: "restaurant" | "dish" | "review" | "photo"
      tag_category: "diet" | "allergen" | "health" | "religious"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      content_status: ["pending", "approved", "rejected"],
      diet_level: ["fully_vegan", "vegetarian", "veg_friendly"],
      photo_kind: ["menu", "dish", "place"],
      report_reason: [
        "not_vegan",
        "not_vegetarian",
        "allergen_info_wrong",
        "wrong_hours",
        "permanently_closed",
        "wrong_location",
        "duplicate",
        "inappropriate",
        "other",
      ],
      report_status: ["open", "resolved", "dismissed"],
      report_target: ["restaurant", "dish", "review", "photo"],
      tag_category: ["diet", "allergen", "health", "religious"],
      user_role: ["user", "admin"],
    },
  },
} as const
