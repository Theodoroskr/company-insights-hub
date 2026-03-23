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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api4all_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          project_code: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          project_code?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          project_code?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          payload: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      change_events: {
        Row: {
          company_id: string | null
          detected_at: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          notified_at: string | null
          old_value: string | null
          severity: string | null
          subscription_id: string | null
        }
        Insert: {
          company_id?: string | null
          detected_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notified_at?: string | null
          old_value?: string | null
          severity?: string | null
          subscription_id?: string | null
        }
        Update: {
          company_id?: string | null
          detected_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notified_at?: string | null
          old_value?: string | null
          severity?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "monitoring_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cached_at: string | null
          country_code: string
          icg_code: string
          id: string
          legal_form: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          raw_source_json: Json | null
          reg_no: string | null
          registered_address: string | null
          slug: string | null
          status: string | null
          tenant_id: string | null
          vat_no: string | null
        }
        Insert: {
          cached_at?: string | null
          country_code: string
          icg_code: string
          id?: string
          legal_form?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          raw_source_json?: Json | null
          reg_no?: string | null
          registered_address?: string | null
          slug?: string | null
          status?: string | null
          tenant_id?: string | null
          vat_no?: string | null
        }
        Update: {
          cached_at?: string | null
          country_code?: string
          icg_code?: string
          id?: string
          legal_form?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          raw_source_json?: Json | null
          reg_no?: string | null
          registered_address?: string | null
          slug?: string | null
          status?: string | null
          tenant_id?: string | null
          vat_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          api4all_supported: boolean | null
          code: string
          display_order: number | null
          flag_emoji: string | null
          is_featured: boolean | null
          name: string
          region: string | null
        }
        Insert: {
          api4all_supported?: boolean | null
          code: string
          display_order?: number | null
          flag_emoji?: string | null
          is_featured?: boolean | null
          name: string
          region?: string | null
        }
        Update: {
          api4all_supported?: boolean | null
          code?: string
          display_order?: number | null
          flag_emoji?: string | null
          is_featured?: boolean | null
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          api4all_raw_json: Json | null
          company_id: string | null
          download_expires_at: string | null
          download_token: string | null
          generated_at: string | null
          id: string
          order_item_id: string | null
          pdf_storage_path: string | null
          report_type: string | null
          version: number | null
        }
        Insert: {
          api4all_raw_json?: Json | null
          company_id?: string | null
          download_expires_at?: string | null
          download_token?: string | null
          generated_at?: string | null
          id?: string
          order_item_id?: string | null
          pdf_storage_path?: string | null
          report_type?: string | null
          version?: number | null
        }
        Update: {
          api4all_raw_json?: Json | null
          company_id?: string | null
          download_expires_at?: string | null
          download_token?: string | null
          generated_at?: string | null
          id?: string
          order_item_id?: string | null
          pdf_storage_path?: string | null
          report_type?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_subscriptions: {
        Row: {
          active: boolean | null
          company_id: string | null
          created_at: string | null
          frequency: string | null
          id: string
          next_check_at: string | null
          plan: string | null
          stripe_subscription_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          company_id?: string | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          next_check_at?: string | null
          plan?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: string | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          next_check_at?: string | null
          plan?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          api4all_item_code: string | null
          api4all_order_id: string | null
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          fresh_investigation: boolean | null
          fulfillment_status: string | null
          id: string
          order_id: string | null
          product_id: string | null
          sla_deadline: string | null
          speed: string | null
          unit_price: number
          vat_amount: number | null
        }
        Insert: {
          api4all_item_code?: string | null
          api4all_order_id?: string | null
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          fresh_investigation?: boolean | null
          fulfillment_status?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          sla_deadline?: string | null
          speed?: string | null
          unit_price: number
          vat_amount?: number | null
        }
        Update: {
          api4all_item_code?: string | null
          api4all_order_id?: string | null
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          fresh_investigation?: boolean | null
          fulfillment_status?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          sla_deadline?: string | null
          speed?: string | null
          unit_price?: number
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          guest_details: Json | null
          guest_email: string | null
          id: string
          notes: string | null
          order_ref: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tenant_id: string | null
          total: number
          updated_at: string | null
          user_id: string | null
          vat_amount: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          guest_details?: Json | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_ref?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tenant_id?: string | null
          total: number
          updated_at?: string | null
          user_id?: string | null
          vat_amount?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          guest_details?: Json | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_ref?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          api4all_product_code: string | null
          available_speeds: Json | null
          base_price: number
          created_at: string | null
          delivery_sla_hours: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_instant: boolean | null
          name: string
          product_image_url: string | null
          sample_pdf_url: string | null
          service_fee: number | null
          slug: string
          tenant_id: string | null
          type: string
          vat_on_fee_only: boolean | null
          vat_on_full_price: boolean | null
          what_is_included: string[] | null
        }
        Insert: {
          api4all_product_code?: string | null
          available_speeds?: Json | null
          base_price: number
          created_at?: string | null
          delivery_sla_hours?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_instant?: boolean | null
          name: string
          product_image_url?: string | null
          sample_pdf_url?: string | null
          service_fee?: number | null
          slug: string
          tenant_id?: string | null
          type: string
          vat_on_fee_only?: boolean | null
          vat_on_full_price?: boolean | null
          what_is_included?: string[] | null
        }
        Update: {
          api4all_product_code?: string | null
          available_speeds?: Json | null
          base_price?: number
          created_at?: string | null
          delivery_sla_hours?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_instant?: boolean | null
          name?: string
          product_image_url?: string | null
          sample_pdf_url?: string | null
          service_fee?: number | null
          slug?: string
          tenant_id?: string | null
          type?: string
          vat_on_fee_only?: boolean | null
          vat_on_full_price?: boolean | null
          what_is_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tenant_id: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id?: string | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string
          query: string | null
          results_count: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          query?: string | null
          results_count?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          query?: string | null
          results_count?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_name: string
          country_code: string | null
          created_at: string | null
          domain: string
          favicon_url: string | null
          footer_disclaimer: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          primary_color: string | null
          slug: string
        }
        Insert: {
          brand_name: string
          country_code?: string | null
          created_at?: string | null
          domain: string
          favicon_url?: string | null
          footer_disclaimer?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          slug: string
        }
        Update: {
          brand_name?: string
          country_code?: string | null
          created_at?: string | null
          domain?: string
          favicon_url?: string | null
          footer_disclaimer?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
