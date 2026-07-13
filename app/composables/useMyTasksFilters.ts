import { ref, computed, watch } from 'vue'
import { useState } from '#imports'

export interface MyTasksFilters {
  board: string[]
  status: string[]
  priority: string[]
  timeline: string[]
}

// Carregar filtros do localStorage
function loadFiltersFromStorage(): MyTasksFilters {
  if (!import.meta.client) {
    return { board: [], status: [], priority: [], timeline: [] }
  }
  
  try {
    const stored = localStorage.getItem('my-tasks-filters')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[useMyTasksFilters] Error loading filters from localStorage:', e)
  }
  
  return { board: [], status: [], priority: [], timeline: [] }
}

// Salvar filtros no localStorage
function saveFiltersToStorage(filters: MyTasksFilters) {
  if (!import.meta.client) return
  
  try {
    localStorage.setItem('my-tasks-filters', JSON.stringify(filters))
  } catch (e) {
    console.error('[useMyTasksFilters] Error saving filters to localStorage:', e)
  }
}

const activeFilters = ref<MyTasksFilters>(loadFiltersFromStorage())

// Watch para salvar automaticamente quando mudar
if (import.meta.client) {
  watch(activeFilters, (newFilters) => {
    saveFiltersToStorage(newFilters)
  }, { deep: true })
}

export function useMyTasksFilters() {
  const searchQuery = useState<string>('search:query', () => '')

  const hasActiveFilters = computed(() => {
    return Object.values(activeFilters.value).some(arr => arr.length > 0) || !!searchQuery.value
  })

  function toggleFilter(column: keyof MyTasksFilters, value: string) {
    const filters = activeFilters.value[column]
    const index = filters.indexOf(value)
    
    if (index > -1) {
      filters.splice(index, 1)
    } else {
      filters.push(value)
    }
  }

  function isFilterActive(column: keyof MyTasksFilters, value: string) {
    return activeFilters.value[column].includes(value)
  }

  function getActiveFiltersCount(column: keyof MyTasksFilters) {
    return activeFilters.value[column].length
  }

  function clearFilters() {
    activeFilters.value = {
      board: [],
      status: [],
      priority: [],
      timeline: []
    }
  }

  function clearColumnFilters(column: keyof MyTasksFilters) {
    activeFilters.value[column] = []
  }

  function filterTasks(tasks: any[]) {
    if (!hasActiveFilters.value) return tasks

    let filtered = tasks

    // Filtro de busca por texto (título, descrição, notas, responsáveis, subtarefas, orçamento)
    if (searchQuery.value && searchQuery.value.trim() !== '') {
      const query = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(query)
        const descMatch = task.description?.toLowerCase().includes(query)
        const notesMatch = task.notes?.toLowerCase().includes(query)
        
        const assigneeMatch = task.assignees?.some((a: any) => 
          a.full_name?.toLowerCase().includes(query) ||
          a.email?.toLowerCase().includes(query)
        )

        const subtaskMatch = task.subtasks?.some((s: any) => 
          s.title?.toLowerCase().includes(query)
        )

        const budgetMatch = task.budget !== undefined && task.budget !== null && String(task.budget).includes(query)

        return titleMatch || descMatch || notesMatch || assigneeMatch || subtaskMatch || budgetMatch
      })
    }

    // Filtros estruturais (board, status, prioridade, timeline)
    const hasStructuralFilters = Object.values(activeFilters.value).some(arr => arr.length > 0)
    if (hasStructuralFilters) {
      filtered = filtered.filter(task => {
        // Filtro de board
        if (activeFilters.value.board.length > 0) {
          if (!activeFilters.value.board.includes(task.board_id)) {
            return false
          }
        }

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

        // Filtro de cronograma
        if (activeFilters.value.timeline.length > 0) {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          
          let dueDate: Date | null = null
          if (task.due_date) {
            const [year, month, day] = task.due_date.split('-').map(Number)
            dueDate = new Date(year, month - 1, day)
            dueDate.setHours(0, 0, 0, 0)
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

    return filtered
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
