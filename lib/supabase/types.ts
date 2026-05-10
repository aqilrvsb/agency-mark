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
      activity_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_data: {
        Row: {
          ad_account_currency: string | null
          ad_id: string | null
          brand_id: string | null
          company_id: string
          created_at: string | null
          data: Json
          date_end: string
          date_start: string
          id: string
          marketer_id: string | null
          platform: string
          platform_ad_account_id: string | null
        }
        Insert: {
          ad_account_currency?: string | null
          ad_id?: string | null
          brand_id?: string | null
          company_id: string
          created_at?: string | null
          data: Json
          date_end: string
          date_start: string
          id?: string
          marketer_id?: string | null
          platform: string
          platform_ad_account_id?: string | null
        }
        Update: {
          ad_account_currency?: string | null
          ad_id?: string | null
          brand_id?: string | null
          company_id?: string
          created_at?: string | null
          data?: Json
          date_end?: string
          date_start?: string
          id?: string
          marketer_id?: string | null
          platform?: string
          platform_ad_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_data_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_data_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      adzviser_connections: {
        Row: {
          api_key: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          notes: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          api_key: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          notes?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          api_key?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          notes?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adzviser_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      adzviser_sync_logs: {
        Row: {
          brand_id: string | null
          company_id: string
          error_message: string | null
          id: string
          platform: string | null
          rows_fetched: number | null
          status: string
          synced_at: string | null
        }
        Insert: {
          brand_id?: string | null
          company_id: string
          error_message?: string | null
          id?: string
          platform?: string | null
          rows_fetched?: number | null
          status: string
          synced_at?: string | null
        }
        Update: {
          brand_id?: string | null
          company_id?: string
          error_message?: string | null
          id?: string
          platform?: string | null
          rows_fetched?: number | null
          status?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adzviser_sync_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adzviser_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          company_id: string
          created_at: string | null
          current_period_end: string | null
          external_subscription_id: string | null
          id: string
          monthly_price_myr: number
          payment_provider: string | null
          plan: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_period_end?: string | null
          external_subscription_id?: string | null
          id?: string
          monthly_price_myr: number
          payment_provider?: string | null
          plan: string
          status: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_period_end?: string | null
          external_subscription_id?: string | null
          id?: string
          monthly_price_myr?: number
          payment_provider?: string | null
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_history: {
        Row: {
          campaign_name: string | null
          company_id: string
          created_at: string | null
          current_value: number | null
          id: string
          is_read: boolean | null
          marketer_id: string | null
          message: string
          metric: string
          rule_id: string | null
          severity: string
          threshold_value: number | null
        }
        Insert: {
          campaign_name?: string | null
          company_id: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          marketer_id?: string | null
          message: string
          metric: string
          rule_id?: string | null
          severity: string
          threshold_value?: number | null
        }
        Update: {
          campaign_name?: string | null
          company_id?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          marketer_id?: string | null
          message?: string
          metric?: string
          rule_id?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          company_id: string
          condition: string
          created_at: string | null
          id: string
          is_active: boolean | null
          metric: string
          name: string
          notify_roles: string[] | null
          severity: string
          threshold: number | null
        }
        Insert: {
          company_id: string
          condition: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric: string
          name: string
          notify_roles?: string[] | null
          severity?: string
          threshold?: number | null
        }
        Update: {
          company_id?: string
          condition?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric?: string
          name?: string
          notify_roles?: string[] | null
          severity?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_ad_accounts: {
        Row: {
          brand_id: string
          company_id: string
          created_at: string | null
          external_account_id: string
          external_account_name: string | null
          id: string
          is_active: boolean | null
          platform: string
        }
        Insert: {
          brand_id: string
          company_id: string
          created_at?: string | null
          external_account_id: string
          external_account_name?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
        }
        Update: {
          brand_id?: string
          company_id?: string
          created_at?: string | null
          external_account_id?: string
          external_account_name?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_ad_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_ad_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_notes: {
        Row: {
          author_id: string | null
          body: string
          brand_id: string
          company_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          brand_id: string
          company_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          brand_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_platform_ad_accounts: {
        Row: {
          ad_account_name: string | null
          brand_id: string
          company_id: string
          created_at: string
          currency: string | null
          id: string
          last_synced_at: string | null
          platform: string
          platform_ad_account_id: string
          social_account_id: string
          status: string | null
          timezone_name: string | null
        }
        Insert: {
          ad_account_name?: string | null
          brand_id: string
          company_id: string
          created_at?: string
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          platform: string
          platform_ad_account_id: string
          social_account_id: string
          status?: string | null
          timezone_name?: string | null
        }
        Update: {
          ad_account_name?: string | null
          brand_id?: string
          company_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          platform_ad_account_id?: string
          social_account_id?: string
          status?: string | null
          timezone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_platform_ad_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_platform_ad_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          assigned_client_user_id: string | null
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          updated_at: string | null
          zernio_profile_id: string | null
        }
        Insert: {
          assigned_client_user_id?: string | null
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          updated_at?: string | null
          zernio_profile_id?: string | null
        }
        Update: {
          assigned_client_user_id?: string | null
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          updated_at?: string | null
          zernio_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_assigned_client_user_id_fkey"
            columns: ["assigned_client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_topups: {
        Row: {
          amount_myr: number
          brand_id: string
          created_at: string | null
          id: string
          payment_method: string | null
          reference: string | null
          status: string
        }
        Insert: {
          amount_myr: number
          brand_id: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          reference?: string | null
          status: string
        }
        Update: {
          amount_myr?: number
          brand_id?: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_topups_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_annotations: {
        Row: {
          anchor_date: string
          author_id: string | null
          body: string
          brand_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          anchor_date: string
          author_id?: string | null
          body: string
          brand_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          anchor_date?: string
          author_id?: string | null
          body?: string
          brand_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_annotations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_budgets: {
        Row: {
          brand_id: string
          company_id: string
          created_at: string | null
          current_balance_myr: number
          id: string
          total_spent_myr: number
          total_topup_myr: number
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          company_id: string
          created_at?: string | null
          current_balance_myr?: number
          id?: string
          total_spent_myr?: number
          total_topup_myr?: number
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          company_id?: string
          created_at?: string | null
          current_balance_myr?: number
          id?: string
          total_spent_myr?: number
          total_topup_myr?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_budgets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          prefix: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          prefix?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_column_views: {
        Row: {
          column_order: Json
          company_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          column_order: Json
          company_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Update: {
          column_order?: Json
          company_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_column_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_columns: {
        Row: {
          company_id: string
          created_at: string | null
          data_type: string
          formula: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_type?: string
          formula?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_type?: string
          formula?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_columns: {
        Row: {
          category: string
          data_type: string
          id: number
          is_default: boolean | null
          key: string
          label: string
        }
        Insert: {
          category: string
          data_type?: string
          id?: number
          is_default?: boolean | null
          key: string
          label: string
        }
        Update: {
          category?: string
          data_type?: string
          id?: number
          is_default?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_myr: number
          company_id: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          status: string
        }
        Insert: {
          amount_myr: number
          company_id: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          status: string
        }
        Update: {
          amount_myr?: number
          company_id?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          brand_id: string | null
          company_id: string
          created_at: string | null
          danger_threshold: number | null
          direction: string
          id: string
          is_active: boolean | null
          metric: string
          target_value: number
          updated_at: string | null
          user_id: string | null
          warning_threshold: number | null
        }
        Insert: {
          brand_id?: string | null
          company_id: string
          created_at?: string | null
          danger_threshold?: number | null
          direction?: string
          id?: string
          is_active?: boolean | null
          metric: string
          target_value: number
          updated_at?: string | null
          user_id?: string | null
          warning_threshold?: number | null
        }
        Update: {
          brand_id?: string | null
          company_id?: string
          created_at?: string | null
          danger_threshold?: number | null
          direction?: string
          id?: string
          is_active?: boolean | null
          metric?: string
          target_value?: number
          updated_at?: string | null
          user_id?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_scores: {
        Row: {
          avg_cpa: number | null
          avg_cpc: number | null
          avg_ctr: number | null
          avg_roas: number | null
          brand_id: string | null
          campaigns_active: number | null
          company_id: string
          created_at: string | null
          id: string
          marketer_id: string
          score_date: string
          score_rating: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_leads: number | null
          total_purchases: number | null
          total_revenue: number | null
          total_spend: number | null
        }
        Insert: {
          avg_cpa?: number | null
          avg_cpc?: number | null
          avg_ctr?: number | null
          avg_roas?: number | null
          brand_id?: string | null
          campaigns_active?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          marketer_id: string
          score_date: string
          score_rating?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_purchases?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Update: {
          avg_cpa?: number | null
          avg_cpc?: number | null
          avg_ctr?: number | null
          avg_roas?: number | null
          brand_id?: string | null
          campaigns_active?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          marketer_id?: string
          score_date?: string
          score_rating?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_purchases?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketer_scores_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketer_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketer_scores_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          archived_at: string | null
          brand_id: string | null
          company_id: string
          created_at: string
          description: string | null
          fields: Json
          filters: Json
          formulas: Json
          id: string
          is_default: boolean
          level: string
          name: string
          owner_user_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          brand_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          fields?: Json
          filters?: Json
          formulas?: Json
          id?: string
          is_default?: boolean
          level: string
          name: string
          owner_user_id: string
          platform: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          brand_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          fields?: Json
          filters?: Json
          formulas?: Json
          id?: string
          is_default?: boolean
          level?: string
          name?: string
          owner_user_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          id_staff: string | null
          is_active: boolean | null
          leader_id: string | null
          role: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          id_staff?: string | null
          is_active?: boolean | null
          leader_id?: string | null
          role: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          id_staff?: string | null
          is_active?: boolean | null
          leader_id?: string | null
          role?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_brand_id: { Args: never; Returns: string }
      current_user_company_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
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
