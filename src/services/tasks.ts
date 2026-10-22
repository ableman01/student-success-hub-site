import { getCurrentUser } from '@/lib/auth'
import { findDuplicateIds, getResourceIdentityKey } from '@/lib/identity'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isResourceModerator } from '@/services/resources'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  course: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
}

export interface NewTask {
  title: string
  description: string
  course: string
  due_date: string | null
  priority: Task['priority']
}

const demoTasksKey = 'student-hub-demo-tasks'

function getDemoTasks () {
  const savedTasks = sessionStorage.getItem(demoTasksKey)
  if (!savedTasks) {
    return [] as Task[]
  }

  try {
    return JSON.parse(savedTasks) as Task[]
  } catch {
    sessionStorage.removeItem(demoTasksKey)
    throw new Error('The locally saved assignments are corrupted. Clear this tab’s session to continue.')
  }
}

function saveDemoTasks (tasks: Task[]) {
  sessionStorage.setItem(demoTasksKey, JSON.stringify(tasks))
}

export async function getTasks () {
  if (!isSupabaseConfigured) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Sign in before loading assignments.')
    }

    return getDemoTasks().filter(task => task.user_id === user.id)
  }

  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return data
}

export async function createTask (task: NewTask) {
  if (!isSupabaseConfigured) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Sign in before adding assignments.')
    }

    const tasks = getDemoTasks()
    const duplicate = tasks.find(existing =>
      existing.user_id === user.id
      && getResourceIdentityKey(existing.course, existing.title) === getResourceIdentityKey(task.course, task.title),
    )
    if (duplicate) {
      throw new Error(`“${task.title.trim()}” is already in your plan${duplicate.course ? ` for ${duplicate.course.trim()}` : ''}. Edit the existing assignment instead of adding it twice.`)
    }

    const newTask: Task = {
      ...task,
      id: globalThis.crypto.randomUUID(),
      user_id: user.id,
      title: task.title.trim(),
      description: task.description.trim(),
      course: task.course.trim(),
      completed: false,
    }

    tasks.push(newTask)
    saveDemoTasks(tasks)
    return newTask
  }

  const { data: existingTasks, error: lookupError } = await getSupabaseClient()
    .from('tasks')
    .select('id, title, course')
    .limit(500)

  if (lookupError) {
    throw lookupError
  }

  const duplicate = (existingTasks || []).find(existing =>
    getResourceIdentityKey(existing.course || '', existing.title || '') === getResourceIdentityKey(task.course, task.title),
  )
  if (duplicate) {
    throw new Error(`“${task.title.trim()}” is already in your plan${duplicate.course ? ` for ${duplicate.course.trim()}` : ''}. Edit the existing assignment instead of adding it twice.`)
  }

  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .insert({
      title: task.title.trim(),
      description: task.description.trim(),
      course: task.course.trim(),
      due_date: task.due_date,
      priority: task.priority,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Finds an assignment that would land on the same identity key.
 * Only the learner's own plan is compared, so two students can keep their own
 * copy of the same brief.
 */
function findDuplicateTask (tasks: Pick<Task, 'id' | 'title' | 'course'>[], ownerId: string, id: Task['id'] | null, course: string, title: string) {
  const key = getResourceIdentityKey(course, title)

  return tasks.find(task =>
    task.id !== id
    && task.user_id === ownerId
    && getResourceIdentityKey(task.course || '', task.title || '') === key,
  )
}

export async function updateTask (
  id: Task['id'],
  changes: Partial<Pick<Task, 'title' | 'description' | 'course' | 'due_date' | 'priority' | 'completed'>>,
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in before updating assignments.')
  }

  const moderator = await isResourceModerator(user.id)

  if (!isSupabaseConfigured) {
    const tasks = getDemoTasks()
    const index = tasks.findIndex(task => task.id === id && task.user_id === user.id)
    if (index === -1) {
      throw new Error('Assignment not found.')
    }

    const task = tasks[index]
    if (!task) {
      throw new Error('Assignment not found.')
    }

    const nextTitle = changes.title === undefined ? task.title : changes.title.trim()
    const nextCourse = changes.course === undefined ? task.course : changes.course.trim()
    const duplicate = changes.title === undefined && changes.course === undefined
      ? undefined
      : findDuplicateTask(tasks, task.user_id, id, nextCourse, nextTitle)
    if (duplicate) {
      throw new Error(`“${nextTitle}” already exists in your plan${nextCourse ? ` for ${nextCourse}` : ''}. Edit that assignment instead of creating a second copy.`)
    }

    tasks[index] = { ...task, ...changes }
    saveDemoTasks(tasks)
    return tasks[index]!
  }

  const { data: existingTasks, error: lookupError } = await getSupabaseClient()
    .from('tasks')
    .select('id, user_id, title, course')
    .limit(500)

  if (lookupError) {
    throw lookupError
  }

  const target = (existingTasks || []).find(task => task.id === id)
  if (!target) {
    throw new Error('Assignment not found.')
  }
  if (target.user_id !== user.id && !moderator) {
    throw new Error('You can only edit your own assignments.')
  }

  const nextTitle = changes.title === undefined ? target.title : changes.title.trim()
  const nextCourse = changes.course === undefined ? target.course : changes.course.trim()
  const duplicate = changes.title === undefined && changes.course === undefined
    ? undefined
    : findDuplicateTask(existingTasks || [], target.user_id, id, nextCourse, nextTitle)
  if (duplicate) {
    throw new Error(`“${nextTitle}” already exists in this plan${nextCourse ? ` for ${nextCourse}` : ''}. Edit that assignment instead of creating a second copy.`)
  }

  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .update(changes)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

function priorityRank (priority: Task['priority']) {
  return priority === 'high' ? 2 : (priority === 'medium' ? 1 : 0)
}

/**
 * Orders assignments so the most useful copy of a duplicate wins:
 * an open assignment beats a completed one, then the earliest deadline.
 */
function compareTasks (a: Pick<Task, 'completed' | 'due_date' | 'id'>, b: Pick<Task, 'completed' | 'due_date' | 'id'>) {
  return Number(a.completed) - Number(b.completed)
    || (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31')
    || a.id.localeCompare(b.id)
}

function mergeDuplicateTasks (tasks: Task[]) {
  const merged = new Map<string, Task>()

  for (const task of tasks.toSorted(compareTasks)) {
    const key = getResourceIdentityKey(task.course, task.title)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...task })
      continue
    }

    const strongerPriority = priorityRank(task.priority) > priorityRank(existing.priority) ? task.priority : existing.priority

    merged.set(key, {
      ...existing,
      description: existing.description || task.description,
      due_date: existing.due_date || task.due_date,
      priority: strongerPriority,
      completed: existing.completed && task.completed,
    })
  }

  return [...merged.values()]
}

export function deduplicateAndSortTasks (tasks: Task[]): Task[] {
  return mergeDuplicateTasks(tasks)
    .toSorted((a, b) => {
      const courseCompare = a.course.localeCompare(b.course, undefined, { sensitivity: 'base' })
      if (courseCompare !== 0) {
        return courseCompare
      }
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return aDate - bDate
    })
}

/**
 * The ids of the redundant copies inside a list of assignments.
 * The most useful entry of every group is kept: an open assignment with the
 * earliest deadline wins over a completed one.
 */
export function findDuplicateTaskIds (tasks: Task[]) {
  return findDuplicateIds(
    tasks,
    task => getResourceIdentityKey(task.course, task.title),
    compareTasks,
  )
}

/** Permanently removes the repeated copies of an assignment. */
export async function removeDuplicateTasks (tasks: Task[]) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !await isResourceModerator(currentUser.id)) {
    throw new Error('Only the site creator can clear duplicate assignments.')
  }

  const duplicateIds = findDuplicateTaskIds(tasks)
  if (duplicateIds.length === 0) {
    return []
  }

  if (!isSupabaseConfigured) {
    saveDemoTasks(getDemoTasks().filter(task => !duplicateIds.includes(task.id)))
    return duplicateIds
  }

  const { error } = await getSupabaseClient()
    .from('tasks')
    .delete()
    .in('id', duplicateIds)

  if (error) {
    throw error
  }

  return duplicateIds
}

export async function deleteTask (id: Task['id']) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !await isResourceModerator(currentUser.id)) {
    throw new Error('Only the site creator can delete assignments.')
  }

  if (!isSupabaseConfigured) {
    const tasks = getDemoTasks()
    const remaining = tasks.filter(task => task.id !== id)
    if (remaining.length === tasks.length) {
      throw new Error('Assignment not found.')
    }
    saveDemoTasks(remaining)
    return
  }

  const { error } = await getSupabaseClient()
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

export { getResourceIdentityKey, normalizeCourseLabel } from '@/lib/identity'
