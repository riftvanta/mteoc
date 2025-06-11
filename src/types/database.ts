export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password: string
          role: 'ADMIN' | 'EXCHANGE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password: string
          role: 'ADMIN' | 'EXCHANGE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password?: string
          role?: 'ADMIN' | 'EXCHANGE'
          created_at?: string
          updated_at?: string
        }
      }
      exchanges: {
        Row: {
          id: string
          name: string
          contact_email: string | null
          contact_phone: string | null
          balance: string
          created_at: string
          updated_at: string
          user_id: string
          incoming_commission_type: 'FIXED' | 'PERCENTAGE'
          incoming_commission_value: string
          outgoing_commission_type: 'FIXED' | 'PERCENTAGE'
          outgoing_commission_value: string
          allowed_incoming_banks: string[]
          allowed_outgoing_banks: string[]
        }
        Insert: {
          id?: string
          name: string
          contact_email?: string | null
          contact_phone?: string | null
          balance?: string
          created_at?: string
          updated_at?: string
          user_id: string
          incoming_commission_type: 'FIXED' | 'PERCENTAGE'
          incoming_commission_value: string
          outgoing_commission_type: 'FIXED' | 'PERCENTAGE'
          outgoing_commission_value: string
          allowed_incoming_banks?: string[]
          allowed_outgoing_banks?: string[]
        }
        Update: {
          id?: string
          name?: string
          contact_email?: string | null
          contact_phone?: string | null
          balance?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          incoming_commission_type?: 'FIXED' | 'PERCENTAGE'
          incoming_commission_value?: string
          outgoing_commission_type?: 'FIXED' | 'PERCENTAGE'
          outgoing_commission_value?: string
          allowed_incoming_banks?: string[]
          allowed_outgoing_banks?: string[]
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          type: 'INCOMING' | 'OUTGOING'
          status: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
          amount: string
          commission: string
          net_amount: string
          sender_name: string | null
          recipient_name: string | null
          bank_name: string | null
          cliq_bank_alias_name: string | null
          cliq_mobile_number: string | null
          rejection_reason: string | null
          cancellation_reason: string | null
          cancellation_requested: boolean
          payment_proof_url: string | null
          completion_proof_url: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          completed_at: string | null
          exchange_id: string
        }
        Insert: {
          id?: string
          order_number: string
          type: 'INCOMING' | 'OUTGOING'
          status?: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
          amount: string
          commission?: string
          net_amount?: string
          sender_name?: string | null
          recipient_name?: string | null
          bank_name?: string | null
          cliq_bank_alias_name?: string | null
          cliq_mobile_number?: string | null
          rejection_reason?: string | null
          cancellation_reason?: string | null
          cancellation_requested?: boolean
          payment_proof_url?: string | null
          completion_proof_url?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          completed_at?: string | null
          exchange_id: string
        }
        Update: {
          id?: string
          order_number?: string
          type?: 'INCOMING' | 'OUTGOING'
          status?: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
          amount?: string
          commission?: string
          net_amount?: string
          sender_name?: string | null
          recipient_name?: string | null
          bank_name?: string | null
          cliq_bank_alias_name?: string | null
          cliq_mobile_number?: string | null
          rejection_reason?: string | null
          cancellation_reason?: string | null
          cancellation_requested?: boolean
          payment_proof_url?: string | null
          completion_proof_url?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          completed_at?: string | null
          exchange_id?: string
        }
      }
      order_messages: {
        Row: {
          id: string
          content: string
          created_at: string
          order_id: string
          sender_id: string
          receiver_id: string
        }
        Insert: {
          id?: string
          content: string
          created_at?: string
          order_id: string
          sender_id: string
          receiver_id: string
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
          order_id?: string
          sender_id?: string
          receiver_id?: string
        }
      }
      banks: {
        Row: {
          id: string
          name: string
          code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      digital_wallets: {
        Row: {
          id: string
          name: string
          code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          updated_at?: string
        }
      }
      order_sequence: {
        Row: {
          id: string
          year: number
          month: number
          sequence: number
        }
        Insert: {
          id?: string
          year: number
          month: number
          sequence: number
        }
        Update: {
          id?: string
          year?: number
          month?: number
          sequence?: number
        }
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