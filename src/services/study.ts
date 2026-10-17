import type { RealtimeChannel } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export type StudyMessageType = 'discussion' | 'assignment'

export interface StudyMessage {
  id: string
  course: string
  user_id: string
  sender_name: string
  message_type: StudyMessageType
  content: string
  created_at: string
}

const maxMessageLength = 2000

function requireSupabase () {
  if (!isSupabaseConfigured) {
    throw new Error('Live study rooms need a connected Supabase project.')
  }

  return getSupabaseClient()
}

function getSchemaError (error: { code?: string, message: string }) {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error('Live study rooms are not set up in Supabase yet. Run the latest supabase/schema.sql in the Supabase SQL Editor, then reload.')
  }

  return new Error(getErrorMessage(error))
}

export async function getStudyMessages (course: string) {
  const { data, error } = await requireSupabase()
    .from('study_messages')
    .select('*')
    .eq('course', course)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    throw getSchemaError(error)
  }

  return data
}

export async function sendStudyMessage (
  course: string,
  messageType: StudyMessageType,
  content: string,
) {
  const text = content.trim()
  if (!text) {
    throw new Error('Write a message before sending.')
  }
  if (text.length > maxMessageLength) {
    throw new Error(`Messages must be ${maxMessageLength} characters or fewer.`)
  }

  const { data, error } = await requireSupabase()
    .from('study_messages')
    .insert({
      course,
      message_type: messageType,
      content: text,
    })
    .select('*')
    .single()

  if (error) {
    throw getSchemaError(error)
  }

  return data
}

export async function subscribeToStudyRoom (
  course: string,
  onMessage: (message: StudyMessage) => void,
  onPresence: (count: number) => void,
  onError: (error: Error) => void,
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in to join a study room.')
  }

  const client = requireSupabase()
  const channel: RealtimeChannel = client.channel(
    `study-room:${encodeURIComponent(course.toLocaleLowerCase())}`,
    { config: { presence: { key: globalThis.crypto.randomUUID() } } },
  )
  channel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_messages' }, payload => {
      const message = payload.new as StudyMessage
      if (message.course === course) {
        onMessage(message)
      }
    })
    .on('presence', { event: 'sync' }, () => {
      onPresence(Object.values(channel.presenceState()).reduce(
        (total, members) => total + members.length,
        0,
      ))
    })

  channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      const { error } = await channel.track({
        online_at: new Date().toISOString(),
      })
      if (error) {
        onError(new Error(getErrorMessage(error, 'Could not join the live room.')))
        return
      }
      onPresence(Object.values(channel.presenceState()).reduce(
        (total, members) => total + members.length,
        0,
      ))
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onError(new Error('Could not connect to the live study room. Check your connection and try again.'))
    }
  })

  return channel
}

export async function leaveStudyRoom (channel: RealtimeChannel | null) {
  if (channel) {
    const { error } = await requireSupabase().removeChannel(channel)
    if (error) {
      throw new Error(getErrorMessage(error, 'Could not leave the live study room cleanly.'))
    }
  }
}
