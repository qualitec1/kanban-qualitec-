import { ref, computed } from 'vue'

export interface TaskFilters {
  status: string[]
  priority: string[]
  assignee: string[]
  timeline: string[]
}

const activeFilters = ref<TaskFilters>({
  status: [],
  priority: [],
  assignee: [],
  timeline: []
})

export function useTaskFilters() {
  const hasActiveFilters = computed(() => {
    return Object.values(activeFilters.value).some(arr => arr.length > 0)
  })

  function toggleFilter(column: keyof TaskFilters, value: string) {
    const filters = activeFilters.value[column]
    const index = filters.indexOf(value)
    
    if (index > -1) {
      filters.splice(index, 1)
    } else {
      filters.push(value)
    }
  }

  function isFilterActive(column: keyof TaskFilters, value: string) {
    return activeFilters.value[column].includes(value)
  }

  function getActiveFiltersCount(column: keyof TaskFilters) {
    return activeFilters.value[column].length
  }

  function clearFilters() {
    activeFilters.value = {
      status: [],
      priority: [],
      assignee: [],
      timeline: []
    }
  }

  function clearColumnFilters(column: keyof TaskFilters) {
    activeFilters.value[column] = []
  }

  function filterTasks(tasks: any[]) {
    if (!hasActiveFilters.value) return tasks

    return tasks.filter(task => {
      // Filtro de status
      if (activeFilters.value.status.length > 0) {
        if (!task.status_id && !activeFilters.value.status.includes('no-status')) {
          return false
        }
        if (task.status_id && !activeFilters.value.status.includes(task.status_id)) {
          return false
        }
      }

      // Filtro de prioridade
      if (activeFilters.value.priority.length > 0) {
        if (!task.priority_id && !activeFilters.value.priority.includes('no-priority')) {
          return false
        }
        if (task.priority_id && !activeFilters.value.priority.includes(task.priority_id)) {
          return false
        }
      }

      // Filtro de responsável
      if (activeFilters.value.assignee.length > 0) {
        const taskAssigneeIds = task.assignees?.map((a: any) => a.user_id) || []
        if (taskAssigneeIds.length === 0 && !activeFilters.value.assignee.includes('no-assignee')) {
          return false
        }
        const hasMatchingAssignee = activeFilters.value.assignee.some(filterId => 
          filterId === 'no-assignee' ? taskAssigneeIds.length === 0 : taskAssigneeIds.includes(filterId)
        )
        if (!hasMatchingAssignee) {
          return false
        }
      }

      // Filtro de cronograma
      if (activeFilters.value.timeline.length > 0) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        // Parse due_date como string no formato YYYY-MM-DD
        let dueDate: Date | null = null
        if (task.due_date) {
          const [year, month, day] = task.due_date.split('-').map(Number)
          dueDate = new Date(year, month - 1, day) // month é 0-indexed
        }

        let matchesTimeline = false

        for (const filter of activeFilters.value.timeline) {
          if (filter === 'no-date' && !dueDate) {
            matchesTimeline = true
            break
          }
          if (filter === 'overdue' && dueDate && dueDate < today) {
            matchesTimeline = true
            break
          }
          if (filter === 'today' && dueDate) {
            if (dueDate.getTime() === today.getTime()) {
              matchesTimeline = true
              break
            }
          }
          if (filter === 'next-7-days' && dueDate) {
            const next7Days = new Date(today)
            next7Days.setDate(next7Days.getDate() + 7)
            if (dueDate >= today && dueDate <= next7Days) {
              matchesTimeline = true
              break
            }
          }
          if (filter === 'next-30-days' && dueDate) {
            const next30Days = new Date(today)
            next30Days.setDate(next30Days.getDate() + 30)
            if (dueDate >= today && dueDate <= next30Days) {
              matchesTimeline = true
              break
            }
          }
        }

        if (!matchesTimeline) {
          return false
        }
      }

      return true
    })
  }

  return {
    activeFilters,
    hasActiveFilters,
    toggleFilter,
    isFilterActive,
    getActiveFiltersCount,
    clearFilters,
    clearColumnFilters,
    filterTasks
  }
}
