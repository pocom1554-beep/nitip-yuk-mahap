export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      courier_ratings: {
        Row: {
          comment: string
          courier_id: string | null
          created_at: string
          customer_id: string
          customer_name: string
          id: string
          order_id: string
          stars: number
          store_name: string
          updated_at: string
        }
        Insert: {
          comment?: string
          courier_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string
          id?: string
          order_id: string
          stars?: number
          store_name?: string
          updated_at?: string
        }
        Update: {
          comment?: string
          courier_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          id?: string
          order_id?: string
          stars?: number
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          item_name: string
          message: string
          reply: string
          status: string
          type: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name?: string
          message?: string
          reply?: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          message?: string
          reply?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_whatsapp: string
          delivery_fee: number
          discount: number
          distance_km: number
          id: string
          items: Json
          items_total: number
          lat: number | null
          lng: number | null
          map_link: string
          note: string
          promo_code: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          address?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string
          customer_whatsapp?: string
          delivery_fee?: number
          discount?: number
          distance_km?: number
          id?: string
          items?: Json
          items_total?: number
          lat?: number | null
          lng?: number | null
          map_link?: string
          note?: string
          promo_code?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_whatsapp?: string
          delivery_fee?: number
          discount?: number
          distance_km?: number
          id?: string
          items?: Json
          items_total?: number
          lat?: number | null
          lng?: number | null
          map_link?: string
          note?: string
          promo_code?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          detail: string
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          price_options: Json
          store_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          detail?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          price_options?: Json
          store_name?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          detail?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          price_options?: Json
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          bio: string
          created_at: string
          full_name: string
          id: string
          is_owner: boolean
          job_title: string
          whatsapp: string
        }
        Insert: {
          address?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          full_name?: string
          id: string
          is_owner?: boolean
          job_title?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          full_name?: string
          id?: string
          is_owner?: boolean
          job_title?: string
          whatsapp?: string
        }
        Relationships: []
      }
      promos: {
        Row: {
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          kind: string
          max_discount: number
          min_spend: number
          quota: number
          starts_at: string | null
          title: string
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_discount?: number
          min_spend?: number
          quota?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_discount?: number
          min_spend?: number
          quota?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          admin_whatsapp: string
          base_fee: number
          close_time: string
          free_km: number
          id: number
          is_open: boolean
          logo_url: string
          open_time: string
          per_km_fee: number
          site_description: string
          site_name: string
          tagline: string
          updated_at: string
        }
        Insert: {
          admin_whatsapp?: string
          base_fee?: number
          close_time?: string
          free_km?: number
          id?: number
          is_open?: boolean
          logo_url?: string
          open_time?: string
          per_km_fee?: number
          site_description?: string
          site_name?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          admin_whatsapp?: string
          base_fee?: number
          close_time?: string
          free_km?: number
          id?: number
          is_open?: boolean
          logo_url?: string
          open_time?: string
          per_km_fee?: number
          site_description?: string
          site_name?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          logo_url: string
          name: string
          open_hours: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          logo_url?: string
          name: string
          open_hours?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          logo_url?: string
          name?: string
          open_hours?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      courier_ranking: {
        Args: never
        Returns: {
          avatar_url: string
          avg_minutes: number
          avg_stars: number
          courier_id: string
          delivered: number
          full_name: string
          job_title: string
          rating_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      product_sales: {
        Args: never
        Returns: {
          product_id: string
          qty: number
        }[]
      }
      public_reviews: {
        Args: { _limit?: number }
        Returns: {
          comment: string
          created_at: string
          display_name: string
          id: string
          stars: number
          store_name: string
        }[]
      }
      store_stats: {
        Args: never
        Returns: {
          items_count: number
          orders_count: number
          store_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "kurir"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer", "kurir"],
    },
  },
} as const
