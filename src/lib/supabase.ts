import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          course: string
          due_date: string | null
          priority: 'low' | 'medium' | 'high'
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string
          course?: string
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          course?: string
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          title: string
          course: string
          description: string
          kind: 'class_material' | 'past_question'
          academic_level: string | null
          file_name: string
          file_path: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          course?: string
          description?: string
          kind: 'class_material' | 'past_question'
          academic_level?: string | null
          file_name: string
          file_path: string
          uploaded_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          course?: string
          description?: string
          kind?: 'class_material' | 'past_question'
          academic_level?: string | null
          file_name?: string
          file_path?: string
          uploaded_by?: string
          created_at?: string
        }
        Relationships: []
      }
      study_messages: {
        Row: {
          id: string
          course: string
          user_id: string
          sender_name: string
          message_type: 'discussion' | 'assignment'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          course: string
          user_id?: string
          sender_name?: string
          message_type?: 'discussion' | 'assignment'
          content: string
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

function hasValidSupabaseConfig () {
  if (!supabaseUrl || !supabaseKey) {
    return false
  }

  if (
    /your[_-]project[_-]id|placeholder|example/i.test(supabaseUrl)
    || /your[_-].*(?:key|supabase)|placeholder|example/i.test(supabaseKey)
  ) {
    return false
  }

  try {
    const parsedUrl = new URL(supabaseUrl)
    return parsedUrl.protocol === 'https:'
      || parsedUrl.hostname === 'localhost'
      || parsedUrl.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = hasValidSupabaseConfig()

let client: SupabaseClient<Database> | undefined

export function getSupabaseClient () {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the project root .env.local file, then restart the dev server.',
    )
  }

  client ??= createClient<Database>(supabaseUrl, supabaseKey)
  return client
}
