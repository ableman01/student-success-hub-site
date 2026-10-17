import { getCurrentUser } from '@/lib/auth'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

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

export async function updateTask (
  id: Task['id'],
  changes: Partial<Pick<Task, 'completed'>>,
) {
  if (!isSupabaseConfigured) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Sign in before updating assignments.')
    }

    const tasks = getDemoTasks()
    const index = tasks.findIndex(task => task.id === id && task.user_id === user.id)
    if (index === -1) {
      throw new Error('Assignment not found.')
    }

    const task = tasks[index]
    if (!task) {
      throw new Error('Assignment not found.')
    }

    tasks[index] = { ...task, ...changes }
    saveDemoTasks(tasks)
    return tasks[index]!
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

export async function deleteTask (id: Task['id']) {
  if (!isSupabaseConfigured) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Sign in before deleting assignments.')
    }

    const tasks = getDemoTasks()
    const remaining = tasks.filter(task => task.id !== id || task.user_id !== user.id)
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
