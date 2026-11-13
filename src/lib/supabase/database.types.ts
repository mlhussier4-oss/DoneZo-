
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
                },"bids": {
                  Row: {
                    "additional_charges": string | null,"availability": string,"business_id": string,"created_at": string,"created_by": string | null,"exclusions": string | null,"id": string,"included": string,"message": string | null,"price_cents": number,"request_id": string,"status": Database["public"]['Enums']["bid_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_charges"?: string | null,"availability": string,"business_id": string,"created_at"?: string,"created_by"?: string | null,"exclusions"?: string | null,"id"?: string,"included": string,"message"?: string | null,"price_cents": number,"request_id": string,"status"?: Database["public"]['Enums']["bid_status"],"updated_at"?: string
                  }
                  Update: {
                    "additional_charges"?: string | null,"availability"?: string,"business_id"?: string,"created_at"?: string,"created_by"?: string | null,"exclusions"?: string | null,"id"?: string,"included"?: string,"message"?: string | null,"price_cents"?: number,"request_id"?: string,"status"?: Database["public"]['Enums']["bid_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "agreed_price_cents": number,"arrival_at": string | null,"bid_id": string | null,"business_id": string,"cancel_reason": string | null,"canceled_at": string | null,"canceled_by": string | null,"completed_at": string | null,"confirm_by": string | null,"confirmed_at": string | null,"created_at": string,"crm_customer_id": string | null,"customer_id": string,"extensions": number,"id": string,"job_id": string | null,"original_price_cents": number,"parent_booking_id": string | null,"request_id": string,"scope": string,"status": Database["public"]['Enums']["booking_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_price_cents": number,"arrival_at"?: string | null,"bid_id"?: string | null,"business_id": string,"cancel_reason"?: string | null,"canceled_at"?: string | null,"canceled_by"?: string | null,"completed_at"?: string | null,"confirm_by"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"crm_customer_id"?: string | null,"customer_id": string,"extensions"?: number,"id"?: string,"job_id"?: string | null,"original_price_cents": number,"parent_booking_id"?: string | null,"request_id": string,"scope": string,"status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Update: {
                    "agreed_price_cents"?: number,"arrival_at"?: string | null,"bid_id"?: string | null,"business_id"?: string,"cancel_reason"?: string | null,"canceled_at"?: string | null,"canceled_by"?: string | null,"completed_at"?: string | null,"confirm_by"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"crm_customer_id"?: string | null,"customer_id"?: string,"extensions"?: number,"id"?: string,"job_id"?: string | null,"original_price_cents"?: number,"parent_booking_id"?: string | null,"request_id"?: string,"scope"?: string,"status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_bid_id_fkey"
      columns: ["bid_id"]
isOneToOne: true
      referencedRelation: "bids"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_crm_customer_id_fkey"
      columns: ["crm_customer_id"]
isOneToOne: false
      referencedRelation: "crm_customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_parent_booking_id_fkey"
      columns: ["parent_booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
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
                },"business_invitations": {
                  Row: {
                    "accepted_at": string | null,"business_id": string,"created_at": string,"email": string,"expires_at": string,"full_name": string | null,"id": string,"invited_by": string | null,"revoked_at": string | null,"role": Database["public"]['Enums']["business_member_role"],"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"business_id": string,"created_at"?: string,"email": string,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role": Database["public"]['Enums']["business_member_role"],"token"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"business_id"?: string,"created_at"?: string,"email"?: string,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["business_member_role"],"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_invitations_business_id_fkey"
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
                },"business_subscriptions": {
                  Row: {
                    "business_id": string,"cancel_at_period_end": boolean,"created_at": string,"current_period_end": string | null,"status": Database["public"]['Enums']["subscription_status"] | null,"stripe_customer_id": string | null,"stripe_subscription_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"] | null,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"] | null,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_subscriptions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "accepted_payment_methods": (string)[],"created_at": string,"created_by": string | null,"default_tax_rate_bps": number,"description": string | null,"email": string | null,"home_zip": string | null,"id": string,"is_suspended": boolean,"logo_path": string | null,"marketplace_enabled": boolean,"marketplace_enabled_at": string | null,"marketplace_removed_reason": string | null,"name": string,"payment_terms_accepted_at": string | null,"payment_terms_accepted_by": string | null,"payment_terms_version": string | null,"phone": string | null,"plan_id": string,"service_radius_miles": number,"timezone": string,"updated_at": string,"verified_at": string | null,"verified_note": string | null,"years_experience": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_payment_methods"?: (string)[],"created_at"?: string,"created_by"?: string | null,"default_tax_rate_bps"?: number,"description"?: string | null,"email"?: string | null,"home_zip"?: string | null,"id"?: string,"is_suspended"?: boolean,"logo_path"?: string | null,"marketplace_enabled"?: boolean,"marketplace_enabled_at"?: string | null,"marketplace_removed_reason"?: string | null,"name": string,"payment_terms_accepted_at"?: string | null,"payment_terms_accepted_by"?: string | null,"payment_terms_version"?: string | null,"phone"?: string | null,"plan_id": string,"service_radius_miles"?: number,"timezone"?: string,"updated_at"?: string,"verified_at"?: string | null,"verified_note"?: string | null,"years_experience"?: number | null
                  }
                  Update: {
                    "accepted_payment_methods"?: (string)[],"created_at"?: string,"created_by"?: string | null,"default_tax_rate_bps"?: number,"description"?: string | null,"email"?: string | null,"home_zip"?: string | null,"id"?: string,"is_suspended"?: boolean,"logo_path"?: string | null,"marketplace_enabled"?: boolean,"marketplace_enabled_at"?: string | null,"marketplace_removed_reason"?: string | null,"name"?: string,"payment_terms_accepted_at"?: string | null,"payment_terms_accepted_by"?: string | null,"payment_terms_version"?: string | null,"phone"?: string | null,"plan_id"?: string,"service_radius_miles"?: number,"timezone"?: string,"updated_at"?: string,"verified_at"?: string | null,"verified_note"?: string | null,"years_experience"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "businesses_home_zip_fkey"
      columns: ["home_zip"]
isOneToOne: false
      referencedRelation: "zip_codes"
      referencedColumns: ["zip"]
    },{
      foreignKeyName: "businesses_payment_terms_accepted_by_fkey"
      columns: ["payment_terms_accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "businesses_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"change_orders": {
                  Row: {
                    "booking_id": string,"created_at": string,"decided_at": string | null,"description": string,"id": string,"new_price_cents": number,"proposed_by": string | null,"status": Database["public"]['Enums']["change_order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"decided_at"?: string | null,"description": string,"id"?: string,"new_price_cents": number,"proposed_by"?: string | null,"status"?: Database["public"]['Enums']["change_order_status"]
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"decided_at"?: string | null,"description"?: string,"id"?: string,"new_price_cents"?: number,"proposed_by"?: string | null,"status"?: Database["public"]['Enums']["change_order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "change_orders_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
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
                },"hidden_requests": {
                  Row: {
                    "business_id": string,"created_at": string,"hidden_by": string | null,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"hidden_by"?: string | null,"request_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"hidden_by"?: string | null,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hidden_requests_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hidden_requests_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
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
                },"job_assignments": {
                  Row: {
                    "assigned_by": string | null,"business_id": string,"created_at": string,"job_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"business_id": string,"created_at"?: string,"job_id": string,"user_id": string
                  }
                  Update: {
                    "assigned_by"?: string | null,"business_id"?: string,"created_at"?: string,"job_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_assignments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_assignments_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
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
                },"messages": {
                  Row: {
                    "body": string | null,"booking_id": string,"created_at": string,"id": string,"photo_path": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"booking_id": string,"created_at"?: string,"id"?: string,"photo_path"?: string | null,"sender_id"?: string
                  }
                  Update: {
                    "body"?: string | null,"booking_id"?: string,"created_at"?: string,"id"?: string,"photo_path"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_records": {
                  Row: {
                    "amount_cents": number,"application_fee_cents": number,"business_id": string,"created_at": string,"customer_id": string,"id": string,"invoice_id": string | null,"job_id": string | null,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"payment_request_id": string | null,"received_on": string,"recorded_by": string | null,"refunded_at": string | null,"refunded_cents": number,"stripe_charge_id": string | null,"stripe_payment_intent_id": string | null,"verification": Database["public"]['Enums']["payment_verification"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"application_fee_cents"?: number,"business_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"invoice_id"?: string | null,"job_id"?: string | null,"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"payment_request_id"?: string | null,"received_on"?: string,"recorded_by"?: string | null,"refunded_at"?: string | null,"refunded_cents"?: number,"stripe_charge_id"?: string | null,"stripe_payment_intent_id"?: string | null,"verification"?: Database["public"]['Enums']["payment_verification"]
                  }
                  Update: {
                    "amount_cents"?: number,"application_fee_cents"?: number,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"invoice_id"?: string | null,"job_id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"payment_request_id"?: string | null,"received_on"?: string,"recorded_by"?: string | null,"refunded_at"?: string | null,"refunded_cents"?: number,"stripe_charge_id"?: string | null,"stripe_payment_intent_id"?: string | null,"verification"?: Database["public"]['Enums']["payment_verification"]
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
    },{
      foreignKeyName: "payment_records_payment_request_id_fkey"
      columns: ["payment_request_id"]
isOneToOne: false
      referencedRelation: "payment_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_requests": {
                  Row: {
                    "amount_cents": number,"application_fee_cents": number,"business_id": string,"checkout_session_id": string,"checkout_url": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"failure_message": string | null,"id": string,"invoice_id": string,"paid_at": string | null,"status": Database["public"]['Enums']["payment_request_status"],"stripe_account_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"application_fee_cents": number,"business_id": string,"checkout_session_id": string,"checkout_url": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"failure_message"?: string | null,"id"?: string,"invoice_id": string,"paid_at"?: string | null,"status"?: Database["public"]['Enums']["payment_request_status"],"stripe_account_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"application_fee_cents"?: number,"business_id"?: string,"checkout_session_id"?: string,"checkout_url"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"failure_message"?: string | null,"id"?: string,"invoice_id"?: string,"paid_at"?: string | null,"status"?: Database["public"]['Enums']["payment_request_status"],"stripe_account_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_requests_business_id_invoice_id_fkey"
      columns: ["business_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["business_id","id"]
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
                    "code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"is_default": boolean,"name": string,"price_cents": number | null,"sort_order": number,"stripe_lookup_key": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string,"price_cents"?: number | null,"sort_order"?: number,"stripe_lookup_key"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"price_cents"?: number | null,"sort_order"?: number,"stripe_lookup_key"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "card_fee_bps": number,"id": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_fee_bps"?: number,"id"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "card_fee_bps"?: number,"id"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"portfolio_photos": {
                  Row: {
                    "business_id": string,"caption": string | null,"created_at": string,"id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"caption"?: string | null,"created_at"?: string,"id"?: string,"storage_path": string
                  }
                  Update: {
                    "business_id"?: string,"caption"?: string | null,"created_at"?: string,"id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "portfolio_photos_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
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
                },"provider_categories": {
                  Row: {
                    "business_id": string,"category_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"category_id": string
                  }
                  Update: {
                    "business_id"?: string,"category_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recurring_schedules": {
                  Row: {
                    "address_id": string | null,"business_id": string,"category_id": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"default_assignee": string | null,"description": string | null,"duration_minutes": number,"end_date": string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"generated_through": string | null,"id": string,"interval_days": number | null,"price_cents": number,"start_date": string,"start_time": string,"status": Database["public"]['Enums']["recurrence_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"business_id": string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"default_assignee"?: string | null,"description"?: string | null,"duration_minutes"?: number,"end_date"?: string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"generated_through"?: string | null,"id"?: string,"interval_days"?: number | null,"price_cents": number,"start_date": string,"start_time": string,"status"?: Database["public"]['Enums']["recurrence_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "address_id"?: string | null,"business_id"?: string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"default_assignee"?: string | null,"description"?: string | null,"duration_minutes"?: number,"end_date"?: string | null,"frequency"?: Database["public"]['Enums']["recurrence_frequency"],"generated_through"?: string | null,"id"?: string,"interval_days"?: number | null,"price_cents"?: number,"start_date"?: string,"start_time"?: string,"status"?: Database["public"]['Enums']["recurrence_status"],"title"?: string,"updated_at"?: string
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
                },"repeat_requests": {
                  Row: {
                    "arrival_time": string,"booking_id": string,"business_id": string,"created_at": string,"customer_id": string,"decided_at": string | null,"first_date": string,"frequency": string,"id": string,"price_cents": number,"status": string,"visits": number
                  }
                  ComputedFields: never
                  Insert: {
                    "arrival_time": string,"booking_id": string,"business_id": string,"created_at"?: string,"customer_id": string,"decided_at"?: string | null,"first_date": string,"frequency": string,"id"?: string,"price_cents": number,"status"?: string,"visits": number
                  }
                  Update: {
                    "arrival_time"?: string,"booking_id"?: string,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"decided_at"?: string | null,"first_date"?: string,"frequency"?: string,"id"?: string,"price_cents"?: number,"status"?: string,"visits"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "repeat_requests_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "repeat_requests_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "repeat_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"request_photos": {
                  Row: {
                    "created_at": string,"customer_id": string,"id": string,"request_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id"?: string,"id"?: string,"request_id": string,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"id"?: string,"request_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_photos_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_photos_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "booking_id": string,"business_id": string,"comment": string | null,"created_at": string,"customer_id": string,"id": string,"rating": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"business_id": string,"comment"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"rating": number
                  }
                  Update: {
                    "booking_id"?: string,"business_id"?: string,"comment"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"rating"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"service_areas": {
                  Row: {
                    "center_zip": string,"created_at": string,"id": string,"is_active": boolean,"name": string,"radius_miles": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "center_zip": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"radius_miles": number,"updated_at"?: string
                  }
                  Update: {
                    "center_zip"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"radius_miles"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_areas_center_zip_fkey"
      columns: ["center_zip"]
isOneToOne: false
      referencedRelation: "zip_codes"
      referencedColumns: ["zip"]
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
                },"service_request_locations": {
                  Row: {
                    "city": string,"customer_id": string,"line1": string,"line2": string | null,"phone": string | null,"request_id": string,"sms_consent": boolean,"state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"customer_id"?: string,"line1": string,"line2"?: string | null,"phone"?: string | null,"request_id": string,"sms_consent"?: boolean,"state"?: string
                  }
                  Update: {
                    "city"?: string,"customer_id"?: string,"line1"?: string,"line2"?: string | null,"phone"?: string | null,"request_id"?: string,"sms_consent"?: boolean,"state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_request_locations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_request_locations_request_id_fkey"
      columns: ["request_id"]
isOneToOne: true
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"service_requests": {
                  Row: {
                    "booked_at": string | null,"canceled_at": string | null,"category_id": string,"created_at": string,"customer_id": string,"description": string,"details": NonNullable<Json>,"expires_at": string,"id": string,"preferred_date": string | null,"status": Database["public"]['Enums']["request_status"],"timing": Database["public"]['Enums']["request_timing"],"updated_at": string,"zip": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booked_at"?: string | null,"canceled_at"?: string | null,"category_id": string,"created_at"?: string,"customer_id"?: string,"description": string,"details"?: NonNullable<Json>,"expires_at"?: string,"id"?: string,"preferred_date"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"timing": Database["public"]['Enums']["request_timing"],"updated_at"?: string,"zip": string
                  }
                  Update: {
                    "booked_at"?: string | null,"canceled_at"?: string | null,"category_id"?: string,"created_at"?: string,"customer_id"?: string,"description"?: string,"details"?: NonNullable<Json>,"expires_at"?: string,"id"?: string,"preferred_date"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"timing"?: Database["public"]['Enums']["request_timing"],"updated_at"?: string,"zip"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_requests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_zip_fkey"
      columns: ["zip"]
isOneToOne: false
      referencedRelation: "zip_codes"
      referencedColumns: ["zip"]
    }
                  ]
                },"stripe_accounts": {
                  Row: {
                    "business_id": string,"charges_enabled": boolean,"created_at": string,"details_submitted": boolean,"disabled_reason": string | null,"payouts_enabled": boolean,"requirements_due": (string)[],"status": Database["public"]['Enums']["stripe_account_status"],"stripe_account_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"charges_enabled"?: boolean,"created_at"?: string,"details_submitted"?: boolean,"disabled_reason"?: string | null,"payouts_enabled"?: boolean,"requirements_due"?: (string)[],"status"?: Database["public"]['Enums']["stripe_account_status"],"stripe_account_id": string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"charges_enabled"?: boolean,"created_at"?: string,"details_submitted"?: boolean,"disabled_reason"?: string | null,"payouts_enabled"?: boolean,"requirements_due"?: (string)[],"status"?: Database["public"]['Enums']["stripe_account_status"],"stripe_account_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_accounts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "account": string | null,"error": string | null,"id": string,"livemode": boolean,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account"?: string | null,"error"?: string | null,"id": string,"livemode": boolean,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "account"?: string | null,"error"?: string | null,"id"?: string,"livemode"?: boolean,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"support_reports": {
                  Row: {
                    "admin_note": string | null,"booking_id": string | null,"category": string,"created_at": string,"id": string,"message": string,"reporter_id": string,"request_id": string | null,"resolved_at": string | null,"status": string,"subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"booking_id"?: string | null,"category": string,"created_at"?: string,"id"?: string,"message": string,"reporter_id"?: string,"request_id"?: string | null,"resolved_at"?: string | null,"status"?: string,"subject"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"booking_id"?: string | null,"category"?: string,"created_at"?: string,"id"?: string,"message"?: string,"reporter_id"?: string,"request_id"?: string | null,"resolved_at"?: string | null,"status"?: string,"subject"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_reports_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "support_reports_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"zip_codes": {
                  Row: {
                    "latitude": number,"longitude": number,"zip": string
                  }
                  ComputedFields: never
                  Insert: {
                    "latitude": number,"longitude": number,"zip": string
                  }
                  Update: {
                    "latitude"?: number,"longitude"?: number,"zip"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_bid":
{ Args: { "p_bid_id": string }; Returns: {
              "agreed_price_cents": number,
"arrival_at": string | null,
"bid_id": string | null,
"business_id": string,
"cancel_reason": string | null,
"canceled_at": string | null,
"canceled_by": string | null,
"completed_at": string | null,
"confirm_by": string | null,
"confirmed_at": string | null,
"created_at": string,
"crm_customer_id": string | null,
"customer_id": string,
"extensions": number,
"id": string,
"job_id": string | null,
"original_price_cents": number,
"parent_booking_id": string | null,
"request_id": string,
"scope": string,
"status": Database["public"]['Enums']["booking_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"accept_invitation_for":
{ Args: { "p_email": string,"p_full_name": string,"p_meta": Json,"p_user_id": string }; Returns: undefined
                           },
"accept_payment_terms":
{ Args: { "p_business_id": string,"p_version": string }; Returns: undefined
                           },
"admin_resolve_report":
{ Args: { "p_note": string,"p_report_id": string }; Returns: {
              "admin_note": string | null,
"booking_id": string | null,
"category": string,
"created_at": string,
"id": string,
"message": string,
"reporter_id": string,
"request_id": string | null,
"resolved_at": string | null,
"status": string,
"subject": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "support_reports"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_set_business_verified":
{ Args: { "p_business_id": string,"p_note": string,"p_verified": boolean }; Returns: {
              "accepted_payment_methods": (string)[],
"created_at": string,
"created_by": string | null,
"default_tax_rate_bps": number,
"description": string | null,
"email": string | null,
"home_zip": string | null,
"id": string,
"is_suspended": boolean,
"logo_path": string | null,
"marketplace_enabled": boolean,
"marketplace_enabled_at": string | null,
"marketplace_removed_reason": string | null,
"name": string,
"payment_terms_accepted_at": string | null,
"payment_terms_accepted_by": string | null,
"payment_terms_version": string | null,
"phone": string | null,
"plan_id": string,
"service_radius_miles": number,
"timezone": string,
"updated_at": string,
"verified_at": string | null,
"verified_note": string | null,
"years_experience": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "businesses"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_set_card_fee":
{ Args: { "p_bps": number }; Returns: {
              "card_fee_bps": number,
"id": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "platform_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_set_marketplace_removed":
{ Args: { "p_business_id": string,"p_reason": string,"p_removed": boolean }; Returns: {
              "accepted_payment_methods": (string)[],
"created_at": string,
"created_by": string | null,
"default_tax_rate_bps": number,
"description": string | null,
"email": string | null,
"home_zip": string | null,
"id": string,
"is_suspended": boolean,
"logo_path": string | null,
"marketplace_enabled": boolean,
"marketplace_enabled_at": string | null,
"marketplace_removed_reason": string | null,
"name": string,
"payment_terms_accepted_at": string | null,
"payment_terms_accepted_by": string | null,
"payment_terms_version": string | null,
"phone": string | null,
"plan_id": string,
"service_radius_miles": number,
"timezone": string,
"updated_at": string,
"verified_at": string | null,
"verified_note": string | null,
"years_experience": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "businesses"
        isOneToOne: true
        isSetofReturn: false
      } },
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
"admin_upsert_service_area":
{ Args: { "p_center_zip": string,"p_id": string,"p_is_active": boolean,"p_name": string,"p_radius_miles": number }; Returns: {
              "center_zip": string,
"created_at": string,
"id": string,
"is_active": boolean,
"name": string,
"radius_miles": number,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "service_areas"
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
"business_can_see_request":
{ Args: { "p_business_id": string,"p_request_id": string }; Returns: boolean
                           },
"business_dashboard":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"business_entitlements":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"business_has_access":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"business_has_crm":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"business_public_stats":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"business_report":
{ Args: { "p_business_id": string,"p_from": string,"p_to": string }; Returns: Json
                           },
"business_report_payments":
{ Args: { "p_business_id": string,"p_from": string,"p_to": string }; Returns: {
              "amount_cents": number,"customer": string,"fee_cents": number,"invoice_number": number,"job_title": string,"method": Database["public"]['Enums']["payment_method"],"note": string,"received_on": string,"refunded_cents": number,"verification": Database["public"]['Enums']["payment_verification"]
            }[]
                           },
"business_report_payments_unchecked":
{ Args: { "p_business_id": string,"p_from": string,"p_to": string }; Returns: {
              "amount_cents": number,"customer": string,"fee_cents": number,"invoice_number": number,"job_title": string,"method": Database["public"]['Enums']["payment_method"],"note": string,"received_on": string,"refunded_cents": number,"verification": Database["public"]['Enums']["payment_verification"]
            }[]
                           },
"business_report_unchecked":
{ Args: { "p_business_id": string,"p_from": string,"p_to": string }; Returns: Json
                           },
"business_today":
{ Args: { "p_business_id": string }; Returns: string
                           },
"cancel_booking":
{ Args: { "p_booking_id": string,"p_reason": string }; Returns: {
              "agreed_price_cents": number,
"arrival_at": string | null,
"bid_id": string | null,
"business_id": string,
"cancel_reason": string | null,
"canceled_at": string | null,
"canceled_by": string | null,
"completed_at": string | null,
"confirm_by": string | null,
"confirmed_at": string | null,
"created_at": string,
"crm_customer_id": string | null,
"customer_id": string,
"extensions": number,
"id": string,
"job_id": string | null,
"original_price_cents": number,
"parent_booking_id": string | null,
"request_id": string,
"scope": string,
"status": Database["public"]['Enums']["booking_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_repeat":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"cancel_request":
{ Args: { "p_request_id": string }; Returns: {
              "booked_at": string | null,
"canceled_at": string | null,
"category_id": string,
"created_at": string,
"customer_id": string,
"description": string,
"details": NonNullable<Json>,
"expires_at": string,
"id": string,
"preferred_date": string | null,
"status": Database["public"]['Enums']["request_status"],
"timing": Database["public"]['Enums']["request_timing"],
"updated_at": string,
"zip": string
            }
                          SetofOptions: {
        from: "*"
        to: "service_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_booking_deadline":
{ Args: { "p_booking_id": string }; Returns: Database["public"]['Enums']["booking_status"]
                           },
"clear_future_recurring_jobs":
{ Args: { "p_schedule_id": string }; Returns: number
                           },
"confirm_booking":
{ Args: { "p_arrival_at": string,"p_booking_id": string }; Returns: {
              "agreed_price_cents": number,
"arrival_at": string | null,
"bid_id": string | null,
"business_id": string,
"cancel_reason": string | null,
"canceled_at": string | null,
"canceled_by": string | null,
"completed_at": string | null,
"confirm_by": string | null,
"confirmed_at": string | null,
"created_at": string,
"crm_customer_id": string | null,
"customer_id": string,
"extensions": number,
"id": string,
"job_id": string | null,
"original_price_cents": number,
"parent_booking_id": string | null,
"request_id": string,
"scope": string,
"status": Database["public"]['Enums']["booking_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
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
"create_invitation":
{ Args: { "p_business_id": string,"p_email": string,"p_full_name": string,"p_role": Database["public"]['Enums']["business_member_role"] }; Returns: {
              "accepted_at": string | null,
"business_id": string,
"created_at": string,
"email": string,
"expires_at": string,
"full_name": string | null,
"id": string,
"invited_by": string | null,
"revoked_at": string | null,
"role": Database["public"]['Enums']["business_member_role"],
"token": string
            }
                          SetofOptions: {
        from: "*"
        to: "business_invitations"
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
"current_user_bid_on":
{ Args: { "p_request_id": string }; Returns: boolean
                           },
"current_user_can_see_request":
{ Args: { "p_request_id": string }; Returns: boolean
                           },
"customer_booking":
{ Args: { "p_request_id": string }; Returns: Json
                           },
"customer_invoices":
{ Args: Record<PropertyKey, never>; Returns: {
              "amount_paid_cents": number,"business_name": string,"due_date": string,"issue_date": string,"number": number,"request_id": string,"status": Database["public"]['Enums']["invoice_status"],"token": string,"total_cents": number
            }[]
                           },
"decide_change_order":
{ Args: { "p_approve": boolean,"p_change_order_id": string }; Returns: {
              "booking_id": string,
"created_at": string,
"decided_at": string | null,
"description": string,
"id": string,
"new_price_cents": number,
"proposed_by": string | null,
"status": Database["public"]['Enums']["change_order_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "change_orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"decide_repeat":
{ Args: { "p_accept": boolean,"p_request_id": string }; Returns: {
              "arrival_time": string,
"booking_id": string,
"business_id": string,
"created_at": string,
"customer_id": string,
"decided_at": string | null,
"first_date": string,
"frequency": string,
"id": string,
"price_cents": number,
"status": string,
"visits": number
            }
                          SetofOptions: {
        from: "*"
        to: "repeat_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"drop_pending_booking":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"expire_pending_bookings":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"expire_requests":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"extend_booking":
{ Args: { "p_booking_id": string }; Returns: {
              "agreed_price_cents": number,
"arrival_at": string | null,
"bid_id": string | null,
"business_id": string,
"cancel_reason": string | null,
"canceled_at": string | null,
"canceled_by": string | null,
"completed_at": string | null,
"confirm_by": string | null,
"confirmed_at": string | null,
"created_at": string,
"crm_customer_id": string | null,
"customer_id": string,
"extensions": number,
"id": string,
"job_id": string | null,
"original_price_cents": number,
"parent_booking_id": string | null,
"request_id": string,
"scope": string,
"status": Database["public"]['Enums']["booking_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"extend_recurring_jobs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"generate_recurring_jobs":
{ Args: { "p_schedule_id": string,"p_through": string }; Returns: number
                           },
"get_provider_profile":
{ Args: { "p_business_id": string }; Returns: Json
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
"invitation_by_token":
{ Args: { "p_token": string }; Returns: {
              "business_name": string,"email": string,"role": Database["public"]['Enums']["business_member_role"],"valid": boolean
            }[]
                           },
"invoice_for_payment":
{ Args: { "p_token": string }; Returns: {
              "balance_cents": number,"business_id": string,"business_name": string,"invoice_id": string,"number": number,"source": Database["public"]['Enums']["job_source"],"status": Database["public"]['Enums']["invoice_status"],"stripe_account_id": string,"stripe_status": Database["public"]['Enums']["stripe_account_status"]
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_assigned_to_customer":
{ Args: { "p_customer_id": string }; Returns: boolean
                           },
"is_assigned_to_job":
{ Args: { "p_job_id": string }; Returns: boolean
                           },
"is_booking_participant":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"is_business_member":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"is_business_staff":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"is_unaccepted_invitee":
{ Args: { "p_email": string }; Returns: string
                           },
"lapse_booking":
{ Args: { "p_booking_id": string,"p_reason": string }; Returns: undefined
                           },
"marketplace_feed":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_icon": string,"category_name": string,"created_at": string,"description": string,"details": Json,"expires_at": string,"id": string,"miles": number,"my_bid_cents": number,"my_bid_status": Database["public"]['Enums']["bid_status"],"photo_count": number,"preferred_date": string,"timing": Database["public"]['Enums']["request_timing"],"zip": string
            }[]
                           },
"marketplace_request_detail":
{ Args: { "p_request_id": string }; Returns: Json
                           },
"miles_between_zips":
{ Args: { "p_a": string,"p_b": string }; Returns: number
                           },
"next_document_number":
{ Args: { "p_business_id": string,"p_kind": string }; Returns: number
                           },
"notify":
{ Args: { "p_body": string,"p_kind": string,"p_link": string,"p_title": string,"p_user_id": string }; Returns: undefined
                           },
"notify_business":
{ Args: { "p_body": string,"p_business_id": string,"p_kind": string,"p_link": string,"p_title": string }; Returns: undefined
                           },
"plan_has_feature":
{ Args: { "p_business_id": string,"p_feature": string }; Returns: boolean
                           },
"register_push_subscription":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string,"p_user_agent": string }; Returns: undefined
                           },
"remove_member":
{ Args: { "p_business_id": string,"p_user_id": string }; Returns: undefined
                           },
"repeat_label":
{ Args: { "p_frequency": string }; Returns: string
                           },
"replace_document_lines":
{ Args: { "p_document_id": string,"p_kind": string,"p_lines": Json }; Returns: undefined
                           },
"request_bids":
{ Args: { "p_request_id": string }; Returns: Json
                           },
"request_repeat":
{ Args: { "p_booking_id": string,"p_first_date": string,"p_frequency": string,"p_visits": number }; Returns: {
              "arrival_time": string,
"booking_id": string,
"business_id": string,
"created_at": string,
"customer_id": string,
"decided_at": string | null,
"first_date": string,
"frequency": string,
"id": string,
"price_cents": number,
"status": string,
"visits": number
            }
                          SetofOptions: {
        from: "*"
        to: "repeat_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
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
"set_business_plan_by_lookup_key":
{ Args: { "p_business_id": string,"p_lookup_key": string }; Returns: undefined
                           },
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
              "accepted_payment_methods": (string)[],
"created_at": string,
"created_by": string | null,
"default_tax_rate_bps": number,
"description": string | null,
"email": string | null,
"home_zip": string | null,
"id": string,
"is_suspended": boolean,
"logo_path": string | null,
"marketplace_enabled": boolean,
"marketplace_enabled_at": string | null,
"marketplace_removed_reason": string | null,
"name": string,
"payment_terms_accepted_at": string | null,
"payment_terms_accepted_by": string | null,
"payment_terms_version": string | null,
"phone": string | null,
"plan_id": string,
"service_radius_miles": number,
"timezone": string,
"updated_at": string,
"verified_at": string | null,
"verified_note": string | null,
"years_experience": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "businesses"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_member_role":
{ Args: { "p_business_id": string,"p_role": Database["public"]['Enums']["business_member_role"],"p_user_id": string }; Returns: undefined
                           },
"signup_plan_id":
{ Args: { "p_meta": Json }; Returns: string
                           },
"stripe_mark_payment_request":
{ Args: { "p_checkout_session_id": string,"p_message": string,"p_status": Database["public"]['Enums']["payment_request_status"] }; Returns: undefined
                           },
"stripe_record_checkout_paid":
{ Args: { "p_amount_cents": number,"p_charge_id": string,"p_checkout_session_id": string,"p_payment_intent_id": string }; Returns: string
                           },
"stripe_record_refund":
{ Args: { "p_payment_intent_id": string,"p_refunded_total_cents": number }; Returns: undefined
                           },
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
      } },
"withdraw_change_order":
{ Args: { "p_change_order_id": string }; Returns: {
              "booking_id": string,
"created_at": string,
"decided_at": string | null,
"description": string,
"id": string,
"new_price_cents": number,
"proposed_by": string | null,
"status": Database["public"]['Enums']["change_order_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "change_orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"zip_in_service_area":
{ Args: { "p_zip": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "customer"|"provider"|"admin","bid_status": "submitted"|"withdrawn"|"accepted"|"closed"|"lapsed","booking_status": "pending"|"active"|"completed"|"canceled"|"lapsed","business_member_role": "owner"|"manager"|"employee","change_order_status": "pending"|"approved"|"declined"|"withdrawn","customer_source": "direct"|"marketplace","estimate_status": "draft"|"sent"|"accepted"|"declined"|"converted","invoice_status": "draft"|"sent"|"partially_paid"|"paid"|"void"|"refunded","job_source": "direct"|"marketplace","job_status": "new"|"scheduled"|"in_progress"|"awaiting_payment"|"completed"|"canceled","payment_method": "cash"|"venmo"|"cash_app"|"check"|"card"|"other","payment_request_status": "open"|"paid"|"failed"|"expired"|"canceled","payment_verification": "provider_recorded"|"stripe_verified","recurrence_frequency": "weekly"|"biweekly"|"monthly"|"custom","recurrence_status": "active"|"paused"|"canceled","request_status": "open"|"pending"|"booked"|"canceled"|"expired","request_timing": "asap"|"tomorrow"|"within_3_days"|"this_week"|"specific_date","stripe_account_status": "onboarding_incomplete"|"pending_verification"|"active"|"restricted","subscription_status": "incomplete"|"incomplete_expired"|"trialing"|"active"|"past_due"|"canceled"|"unpaid"|"paused"
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
            "app_role": ["customer", "provider", "admin"],"bid_status": ["submitted", "withdrawn", "accepted", "closed", "lapsed"],"booking_status": ["pending", "active", "completed", "canceled", "lapsed"],"business_member_role": ["owner", "manager", "employee"],"change_order_status": ["pending", "approved", "declined", "withdrawn"],"customer_source": ["direct", "marketplace"],"estimate_status": ["draft", "sent", "accepted", "declined", "converted"],"invoice_status": ["draft", "sent", "partially_paid", "paid", "void", "refunded"],"job_source": ["direct", "marketplace"],"job_status": ["new", "scheduled", "in_progress", "awaiting_payment", "completed", "canceled"],"payment_method": ["cash", "venmo", "cash_app", "check", "card", "other"],"payment_request_status": ["open", "paid", "failed", "expired", "canceled"],"payment_verification": ["provider_recorded", "stripe_verified"],"recurrence_frequency": ["weekly", "biweekly", "monthly", "custom"],"recurrence_status": ["active", "paused", "canceled"],"request_status": ["open", "pending", "booked", "canceled", "expired"],"request_timing": ["asap", "tomorrow", "within_3_days", "this_week", "specific_date"],"stripe_account_status": ["onboarding_incomplete", "pending_verification", "active", "restricted"],"subscription_status": ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"]
          }
        }
} as const
