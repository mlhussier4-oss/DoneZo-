
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_document_counters": {
                  Row: {
                    "business_id": string,"kind": string,"last_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"kind": string,"last_number"?: number
                  }
                  Update: {
                    "business_id"?: string,"kind"?: string,"last_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_document_counters_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_members": {
                  Row: {
                    "business_id": string,"created_at": string,"role": Database["public"]['Enums']["business_member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"role"?: Database["public"]['Enums']["business_member_role"],"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["business_member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_members_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"default_tax_rate_bps": number,"description": string | null,"email": string | null,"id": string,"is_suspended": boolean,"marketplace_enabled": boolean,"marketplace_enabled_at": string | null,"name": string,"phone": string | null,"plan_id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"default_tax_rate_bps"?: number,"description"?: string | null,"email"?: string | null,"id"?: string,"is_suspended"?: boolean,"marketplace_enabled"?: boolean,"marketplace_enabled_at"?: string | null,"name": string,"phone"?: string | null,"plan_id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"default_tax_rate_bps"?: number,"description"?: string | null,"email"?: string | null,"id"?: string,"is_suspended"?: boolean,"marketplace_enabled"?: boolean,"marketplace_enabled_at"?: string | null,"name"?: string,"phone"?: string | null,"plan_id"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "businesses_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"crm_customer_addresses": {
                  Row: {
                    "access_notes": string | null,"business_id": string,"city": string,"created_at": string,"customer_id": string,"id": string,"is_primary": boolean,"label": string | null,"line1": string,"line2": string | null,"postal_code": string,"state": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_notes"?: string | null,"business_id": string,"city": string,"created_at"?: string,"customer_id": string,"id"?: string,"is_primary"?: boolean,"label"?: string | null,"line1": string,"line2"?: string | null,"postal_code": string,"state": string,"updated_at"?: string
                  }
                  Update: {
                    "access_notes"?: string | null,"business_id"?: string,"city"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"is_primary"?: boolean,"label"?: string | null,"line1"?: string,"line2"?: string | null,"postal_code"?: string,"state"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "crm_customer_addresses_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"crm_customer_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"business_id": string,"created_at": string,"customer_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"business_id": string,"created_at"?: string,"customer_id": string,"id"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "crm_customer_notes_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"crm_customers": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by": string | null,"email": string | null,"full_name": string,"id": string,"is_archived": boolean,"phone": string | null,"profile_id": string | null,"service_preferences": string | null,"source": Database["public"]['Enums']["customer_source"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"is_archived"?: boolean,"phone"?: string | null,"profile_id"?: string | null,"service_preferences"?: string | null,"source"?: Database["public"]['Enums']["customer_source"],"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"is_archived"?: boolean,"phone"?: string | null,"profile_id"?: string | null,"service_preferences"?: string | null,"source"?: Database["public"]['Enums']["customer_source"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "crm_customers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crm_customers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"estimate_line_items": {
                  Row: {
                    "amount_cents": number | null,"business_id": string,"description": string,"estimate_id": string,"id": string,"position": number,"quantity": number,"taxable": boolean,"unit_price_cents": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: never,"business_id": string,"description": string,"estimate_id": string,"id"?: string,"position"?: number,"quantity"?: number,"taxable"?: boolean,"unit_price_cents": number
                  }
                  Update: {
                    "amount_cents"?: never,"business_id"?: string,"description"?: string,"estimate_id"?: string,"id"?: string,"position"?: number,"quantity"?: number,"taxable"?: boolean,"unit_price_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "estimate_line_items_business_id_estimate_id_fkey"
      columns: ["business_id","estimate_id"]
isOneToOne: false
      referencedRelation: "estimates"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"estimates": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by": string | null,"customer_id": string,"decided_at": string | null,"id": string,"issue_date": string,"job_id": string | null,"notes": string | null,"number": number,"public_token": string,"sent_at": string | null,"status": Database["public"]['Enums']["estimate_status"],"subtotal_cents": number,"tax_cents": number,"tax_rate_bps": number,"total_cents": number,"updated_at": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"decided_at"?: string | null,"id"?: string,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number"?: number,"public_token"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["estimate_status"],"subtotal_cents"?: number,"tax_cents"?: number,"tax_rate_bps"?: number,"total_cents"?: number,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"decided_at"?: string | null,"id"?: string,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number"?: number,"public_token"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["estimate_status"],"subtotal_cents"?: number,"tax_cents"?: number,"tax_rate_bps"?: number,"total_cents"?: number,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "estimates_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "estimates_business_id_customer_id_job_id_fkey"
      columns: ["business_id","customer_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","customer_id","id"]
    }
                  ]
                },"invoice_line_items": {
                  Row: {
                    "amount_cents": number | null,"business_id": string,"description": string,"id": string,"invoice_id": string,"position": number,"quantity": number,"taxable": boolean,"unit_price_cents": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: never,"business_id": string,"description": string,"id"?: string,"invoice_id": string,"position"?: number,"quantity"?: number,"taxable"?: boolean,"unit_price_cents": number
                  }
                  Update: {
                    "amount_cents"?: never,"business_id"?: string,"description"?: string,"id"?: string,"invoice_id"?: string,"position"?: number,"quantity"?: number,"taxable"?: boolean,"unit_price_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_line_items_business_id_invoice_id_fkey"
      columns: ["business_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "amount_paid_cents": number,"business_id": string,"created_at": string,"created_by": string | null,"customer_id": string,"due_date": string | null,"estimate_id": string | null,"id": string,"issue_date": string,"job_id": string | null,"notes": string | null,"number": number,"paid_at": string | null,"public_token": string,"sent_at": string | null,"source": Database["public"]['Enums']["job_source"],"status": Database["public"]['Enums']["invoice_status"],"subtotal_cents": number,"tax_cents": number,"tax_rate_bps": number,"total_cents": number,"updated_at": string,"voided_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paid_cents"?: number,"business_id": string,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"due_date"?: string | null,"estimate_id"?: string | null,"id"?: string,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number"?: number,"paid_at"?: string | null,"public_token"?: string,"sent_at"?: string | null,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["invoice_status"],"subtotal_cents"?: number,"tax_cents"?: number,"tax_rate_bps"?: number,"total_cents"?: number,"updated_at"?: string,"voided_at"?: string | null
                  }
                  Update: {
                    "amount_paid_cents"?: number,"business_id"?: string,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"due_date"?: string | null,"estimate_id"?: string | null,"id"?: string,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number"?: number,"paid_at"?: string | null,"public_token"?: string,"sent_at"?: string | null,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["invoice_status"],"subtotal_cents"?: number,"tax_cents"?: number,"tax_rate_bps"?: number,"total_cents"?: number,"updated_at"?: string,"voided_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "invoices_business_id_customer_id_job_id_fkey"
      columns: ["business_id","customer_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","customer_id","id"]
    },{
      foreignKeyName: "invoices_business_id_estimate_id_fkey"
      columns: ["business_id","estimate_id"]
isOneToOne: false
      referencedRelation: "estimates"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"job_photos": {
                  Row: {
                    "business_id": string,"caption": string | null,"created_at": string,"id": string,"job_id": string,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"caption"?: string | null,"created_at"?: string,"id"?: string,"job_id": string,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"caption"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_photos_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_photos_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"job_status_history": {
                  Row: {
                    "business_id": string,"changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["job_status"] | null,"id": number,"job_id": string,"to_status": Database["public"]['Enums']["job_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["job_status"] | null,"id"?: never,"job_id": string,"to_status": Database["public"]['Enums']["job_status"]
                  }
                  Update: {
                    "business_id"?: string,"changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["job_status"] | null,"id"?: never,"job_id"?: string,"to_status"?: Database["public"]['Enums']["job_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_status_history_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_status_history_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "address_id": string | null,"business_id": string,"canceled_at": string | null,"category_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"description": string | null,"id": string,"is_detached": boolean,"notes": string | null,"occurrence_date": string | null,"price_cents": number,"recurring_schedule_id": string | null,"scheduled_end": string | null,"scheduled_start": string | null,"source": Database["public"]['Enums']["job_source"],"started_at": string | null,"status": Database["public"]['Enums']["job_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"business_id": string,"canceled_at"?: string | null,"category_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"description"?: string | null,"id"?: string,"is_detached"?: boolean,"notes"?: string | null,"occurrence_date"?: string | null,"price_cents"?: number,"recurring_schedule_id"?: string | null,"scheduled_end"?: string | null,"scheduled_start"?: string | null,"source"?: Database["public"]['Enums']["job_source"],"started_at"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "address_id"?: string | null,"business_id"?: string,"canceled_at"?: string | null,"category_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"description"?: string | null,"id"?: string,"is_detached"?: boolean,"notes"?: string | null,"occurrence_date"?: string | null,"price_cents"?: number,"recurring_schedule_id"?: string | null,"scheduled_end"?: string | null,"scheduled_start"?: string | null,"source"?: Database["public"]['Enums']["job_source"],"started_at"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_business_id_customer_id_address_id_fkey"
      columns: ["business_id","customer_id","address_id"]
isOneToOne: false
      referencedRelation: "crm_customer_addresses"
      referencedColumns: ["business_id","customer_id","id"]
    },{
      foreignKeyName: "jobs_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "jobs_business_id_recurring_schedule_id_fkey"
      columns: ["business_id","recurring_schedule_id"]
isOneToOne: false
      referencedRelation: "recurring_schedules"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "jobs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_records": {
                  Row: {
                    "amount_cents": number,"business_id": string,"created_at": string,"customer_id": string,"id": string,"invoice_id": string | null,"job_id": string | null,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"received_on": string,"recorded_by": string | null,"verification": Database["public"]['Enums']["payment_verification"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"business_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"invoice_id"?: string | null,"job_id"?: string | null,"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"received_on"?: string,"recorded_by"?: string | null,"verification"?: Database["public"]['Enums']["payment_verification"]
                  }
                  Update: {
                    "amount_cents"?: number,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"invoice_id"?: string | null,"job_id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"received_on"?: string,"recorded_by"?: string | null,"verification"?: Database["public"]['Enums']["payment_verification"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_records_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "payment_records_business_id_customer_id_invoice_id_fkey"
      columns: ["business_id","customer_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["business_id","customer_id","id"]
    },{
      foreignKeyName: "payment_records_business_id_customer_id_job_id_fkey"
      columns: ["business_id","customer_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","customer_id","id"]
    }
                  ]
                },"plan_features": {
                  Row: {
                    "enabled": boolean,"feature_key": string,"limit_value": number | null,"plan_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"feature_key": string,"limit_value"?: number | null,"plan_id": string
                  }
                  Update: {
                    "enabled"?: boolean,"feature_key"?: string,"limit_value"?: number | null,"plan_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"is_default": boolean,"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"is_suspended": boolean,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"is_suspended"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"is_suspended"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recurring_schedules": {
                  Row: {
                    "address_id": string | null,"business_id": string,"category_id": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"description": string | null,"duration_minutes": number,"end_date": string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"generated_through": string | null,"id": string,"interval_days": number | null,"price_cents": number,"start_date": string,"start_time": string,"status": Database["public"]['Enums']["recurrence_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"business_id": string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"description"?: string | null,"duration_minutes"?: number,"end_date"?: string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"generated_through"?: string | null,"id"?: string,"interval_days"?: number | null,"price_cents": number,"start_date": string,"start_time": string,"status"?: Database["public"]['Enums']["recurrence_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "address_id"?: string | null,"business_id"?: string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"description"?: string | null,"duration_minutes"?: number,"end_date"?: string | null,"frequency"?: Database["public"]['Enums']["recurrence_frequency"],"generated_through"?: string | null,"id"?: string,"interval_days"?: number | null,"price_cents"?: number,"start_date"?: string,"start_time"?: string,"status"?: Database["public"]['Enums']["recurrence_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurring_schedules_business_id_customer_id_address_id_fkey"
      columns: ["business_id","customer_id","address_id"]
isOneToOne: false
      referencedRelation: "crm_customer_addresses"
      referencedColumns: ["business_id","customer_id","id"]
    },{
      foreignKeyName: "recurring_schedules_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "recurring_schedules_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"service_categories": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_set_user_suspended":
{ Args: { "p_reason": string,"p_suspended": boolean,"p_user_id": string }; Returns: {
              "created_at": string,
"email": string | null,
"full_name": string | null,
"id": string,
"is_suspended": boolean,
"phone": string | null,
"role": Database["public"]['Enums']["app_role"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_upsert_service_category":
{ Args: { "p_description": string,"p_icon": string,"p_id": string,"p_is_active": boolean,"p_name": string,"p_slug": string,"p_sort_order": number }; Returns: {
              "created_at": string,
"description": string | null,
"icon": string,
"id": string,
"is_active": boolean,
"name": string,
"slug": string,
"sort_order": number,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "service_categories"
        isOneToOne: true
        isSetofReturn: false
      } },
"business_dashboard":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"business_entitlements":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"business_today":
{ Args: { "p_business_id": string }; Returns: string
                           },
"clear_future_recurring_jobs":
{ Args: { "p_schedule_id": string }; Returns: number
                           },
"convert_estimate_to_invoice":
{ Args: { "p_estimate_id": string }; Returns: {
              "amount_paid_cents": number,
"business_id": string,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"due_date": string | null,
"estimate_id": string | null,
"id": string,
"issue_date": string,
"job_id": string | null,
"notes": string | null,
"number": number,
"paid_at": string | null,
"public_token": string,
"sent_at": string | null,
"source": Database["public"]['Enums']["job_source"],
"status": Database["public"]['Enums']["invoice_status"],
"subtotal_cents": number,
"tax_cents": number,
"tax_rate_bps": number,
"total_cents": number,
"updated_at": string,
"voided_at": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "invoices"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_invoice_for_job":
{ Args: { "p_job_id": string }; Returns: {
              "amount_paid_cents": number,
"business_id": string,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"due_date": string | null,
"estimate_id": string | null,
"id": string,
"issue_date": string,
"job_id": string | null,
"notes": string | null,
"number": number,
"paid_at": string | null,
"public_token": string,
"sent_at": string | null,
"source": Database["public"]['Enums']["job_source"],
"status": Database["public"]['Enums']["invoice_status"],
"subtotal_cents": number,
"tax_cents": number,
"tax_rate_bps": number,
"total_cents": number,
"updated_at": string,
"voided_at": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "invoices"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"extend_recurring_jobs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"generate_recurring_jobs":
{ Args: { "p_schedule_id": string,"p_through": string }; Returns: number
                           },
"get_public_estimate":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_public_invoice":
{ Args: { "p_token": string }; Returns: Json
                           },
"has_business_role":
{ Args: { "p_business_id": string,"p_roles": (Database["public"]['Enums']["business_member_role"])[] }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_business_member":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"next_document_number":
{ Args: { "p_business_id": string,"p_kind": string }; Returns: number
                           },
"replace_document_lines":
{ Args: { "p_document_id": string,"p_kind": string,"p_lines": Json }; Returns: undefined
                           },
"send_invoice":
{ Args: { "p_invoice_id": string }; Returns: {
              "amount_paid_cents": number,
"business_id": string,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"due_date": string | null,
"estimate_id": string | null,
"id": string,
"issue_date": string,
"job_id": string | null,
"notes": string | null,
"number": number,
"paid_at": string | null,
"public_token": string,
"sent_at": string | null,
"source": Database["public"]['Enums']["job_source"],
"status": Database["public"]['Enums']["invoice_status"],
"subtotal_cents": number,
"tax_cents": number,
"tax_rate_bps": number,
"total_cents": number,
"updated_at": string,
"voided_at": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "invoices"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_estimate_status":
{ Args: { "p_estimate_id": string,"p_status": Database["public"]['Enums']["estimate_status"] }; Returns: {
              "business_id": string,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"decided_at": string | null,
"id": string,
"issue_date": string,
"job_id": string | null,
"notes": string | null,
"number": number,
"public_token": string,
"sent_at": string | null,
"status": Database["public"]['Enums']["estimate_status"],
"subtotal_cents": number,
"tax_cents": number,
"tax_rate_bps": number,
"total_cents": number,
"updated_at": string,
"valid_until": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "estimates"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_marketplace_enabled":
{ Args: { "p_business_id": string,"p_enabled": boolean }; Returns: {
              "created_at": string,
"created_by": string | null,
"default_tax_rate_bps": number,
"description": string | null,
"email": string | null,
"id": string,
"is_suspended": boolean,
"marketplace_enabled": boolean,
"marketplace_enabled_at": string | null,
"name": string,
"phone": string | null,
"plan_id": string,
"timezone": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "businesses"
        isOneToOne: true
        isSetofReturn: false
      } },
"void_invoice":
{ Args: { "p_invoice_id": string }; Returns: {
              "amount_paid_cents": number,
"business_id": string,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"due_date": string | null,
"estimate_id": string | null,
"id": string,
"issue_date": string,
"job_id": string | null,
"notes": string | null,
"number": number,
"paid_at": string | null,
"public_token": string,
"sent_at": string | null,
"source": Database["public"]['Enums']["job_source"],
"status": Database["public"]['Enums']["invoice_status"],
"subtotal_cents": number,
"tax_cents": number,
"tax_rate_bps": number,
"total_cents": number,
"updated_at": string,
"voided_at": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "invoices"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "app_role": "customer"|"provider"|"admin","business_member_role": "owner"|"manager"|"employee","customer_source": "direct"|"marketplace","estimate_status": "draft"|"sent"|"accepted"|"declined"|"converted","invoice_status": "draft"|"sent"|"partially_paid"|"paid"|"void","job_source": "direct"|"marketplace","job_status": "new"|"scheduled"|"in_progress"|"awaiting_payment"|"completed"|"canceled","payment_method": "cash"|"venmo"|"cash_app"|"check"|"card"|"other","payment_verification": "provider_recorded"|"stripe_verified","recurrence_frequency": "weekly"|"biweekly"|"monthly"|"custom","recurrence_status": "active"|"paused"|"canceled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["customer", "provider", "admin"],"business_member_role": ["owner", "manager", "employee"],"customer_source": ["direct", "marketplace"],"estimate_status": ["draft", "sent", "accepted", "declined", "converted"],"invoice_status": ["draft", "sent", "partially_paid", "paid", "void"],"job_source": ["direct", "marketplace"],"job_status": ["new", "scheduled", "in_progress", "awaiting_payment", "completed", "canceled"],"payment_method": ["cash", "venmo", "cash_app", "check", "card", "other"],"payment_verification": ["provider_recorded", "stripe_verified"],"recurrence_frequency": ["weekly", "biweekly", "monthly", "custom"],"recurrence_status": ["active", "paused", "canceled"]
          }
        }
} as const
