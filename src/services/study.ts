import type { RealtimeChannel } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export type StudyMessageType = 'discussion' | 'assignment'
export type GroupPostType = 'discussion' | 'question' | 'assignment' | 'practice'

export interface StudyGroup {
  id: string
  name: string
  course: string
  description: string
  invite_code: string
  owner_id: string
}

export interface StudyGroupPost {
  id: string
  group_id: string
  user_id: string
  sender_name: string
  post_type: GroupPostType
  content: string
  created_at: string
}

export interface StudyMessage {
  id: string
  course: string
  user_id: string
  sender_name: string
  message_type: StudyMessageType
  content: string
  created_at: string
}

export async function getStudyGroups () {
  const client = requireSupabase()
  const { data: memberships, error: membershipError } = await client
    .from('study_group_members')
    .select('group_id')
  if (membershipError) throw getSchemaError(membershipError)

  const groupIds = (memberships ?? []).map(item => item.group_id)
  if (groupIds.length === 0) return []

  const { data, error } = await client.from('study_groups').select('*').in('id', groupIds).order('created_at', { ascending: false })
  if (error) throw getSchemaError(error)
  return data as StudyGroup[]
}

export async function createStudyGroup (input: { name: string, course: string, description: string }) {
  const { data, error } = await requireSupabase().functions.invoke('create-study-group', { body: input })
  if (error) throw await getFunctionError(error)
  return data as StudyGroup
}

export async function joinStudyGroup (inviteCode: string) {
  const { data, error } = await requireSupabase().functions.invoke('join-study-group', { body: { invite_code: inviteCode.trim() } })
  if (error) throw await getFunctionError(error)
  return data as Pick<StudyGroup, 'id' | 'name' | 'course' | 'description'>
}

async function getFunctionError (error: unknown) {
  if (typeof error === 'object' && error !== null && 'context' in error && error.context instanceof Response) {
    try {
      const body = await error.context.clone().json() as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return new Error(body.error)
    } catch {
      // Use the SDK error below when the response has no JSON body.
    }
  }
  return getSchemaError(error as { code?: string, message: string })
}

export async function getStudyGroupPosts (groupId: string) {
  const { data, error } = await requireSupabase().from('study_group_posts').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(100)
  if (error) throw getSchemaError(error)
  return data as StudyGroupPost[]
}

export async function sendStudyGroupPost (groupId: string, postType: GroupPostType, content: string) {
  const text = content.trim()
  if (!text || text.length > maxMessageLength) throw new Error('Write a message of 1–2,000 characters before sending.')
  const { data, error } = await requireSupabase().from('study_group_posts').insert({ group_id: groupId, post_type: postType, content: text }).select('*').single()
  if (error) throw getSchemaError(error)
  return data as StudyGroupPost
}

export function subscribeToStudyGroup (groupId: string, onPost: (post: StudyGroupPost) => void) {
  return requireSupabase().channel(`study-group:${groupId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_group_posts', filter: `group_id=eq.${groupId}` }, payload => onPost(payload.new as StudyGroupPost))
    .subscribe()
}

export async function leaveStudyGroup (channel: RealtimeChannel | null) {
  if (channel) {
    const { error } = await requireSupabase().removeChannel(channel)
    if (error) throw new Error(getErrorMessage(error, 'Could not leave the group room cleanly.'))
  }
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
