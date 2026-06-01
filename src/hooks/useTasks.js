import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const ASSIGNMENT_WITH_DETAILS = `
  *,
  task_definitions(*),
  profiles!assigned_to(id, full_name, avatar_emoji, role),
  task_submissions(*, profiles!submitted_by(full_name, avatar_emoji)),
  validations(*, profiles!reviewed_by(full_name, avatar_emoji))
`

export function useTasks({ mine = false, pendingReview = false, month, year } = {}) {
  const { profile } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!profile?.household_id) return
    setLoading(true)

    let q = supabase
      .from('task_assignments')
      .select(ASSIGNMENT_WITH_DETAILS)
      .eq('household_id', profile.household_id)
      .order('due_date', { ascending: true })

    if (mine)          q = q.eq('assigned_to', profile.id)
    if (pendingReview) q = q.eq('status', 'submitted')
    if (month)         q = q.eq('month', month)
    if (year)          q = q.eq('year', year)

    const { data, error: err } = await q
    if (err) setError(err)
    else setTasks(data || [])
    setLoading(false)
  }, [profile?.household_id, profile?.id, mine, pendingReview, month, year])

  useEffect(() => { fetch() }, [fetch])

  return { tasks, loading, error, refetch: fetch }
}

export function useTaskStats(month, year) {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!profile?.household_id) return
    supabase
      .from('task_assignments')
      .select('status, profiles!assigned_to(id, full_name, avatar_emoji, points, streak_days)')
      .eq('household_id', profile.household_id)
      .eq('month', month)
      .eq('year', year)
      .then(({ data }) => {
        if (!data) return
        const total     = data.length
        const validated = data.filter(t => t.status === 'validated').length
        const submitted = data.filter(t => t.status === 'submitted').length
        const pending   = data.filter(t => t.status === 'pending').length
        const rejected  = data.filter(t => t.status === 'rejected').length
        setStats({ total, validated, submitted, pending, rejected,
                   rate: total ? Math.round((validated / total) * 100) : 0 })
      })
  }, [profile?.household_id, month, year])

  return stats
}
