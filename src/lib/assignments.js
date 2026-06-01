import { addDays, startOfMonth, getWeeksInMonth } from 'date-fns'

/**
 * Generate rotating task assignments for a month.
 * Each task definition is assigned once per week, rotating through members.
 *
 * @param {Array} taskDefs - Task definitions
 * @param {Array} members  - Profile ids of aprendices
 * @param {number} month   - 1-12
 * @param {number} year    - e.g. 2026
 * @param {string} householdId
 * @returns {Array} assignments ready to insert
 */
export function generateMonthAssignments(taskDefs, members, month, year, householdId) {
  if (!taskDefs.length || !members.length) return []

  const weeksInMonth = getWeeksInMonth(new Date(year, month - 1))
  const assignments = []
  let rotationIdx = 0

  for (let week = 1; week <= weeksInMonth; week++) {
    const weekStart = startOfMonth(new Date(year, month - 1))
    const dueDate = addDays(weekStart, (week - 1) * 7 + 6) // end of week

    taskDefs.forEach((def) => {
      const assignedTo = members[rotationIdx % members.length]
      rotationIdx++

      assignments.push({
        task_def_id: def.id,
        assigned_to: assignedTo,
        household_id: householdId,
        month,
        year,
        week_number: week,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      })
    })
  }

  return assignments
}
