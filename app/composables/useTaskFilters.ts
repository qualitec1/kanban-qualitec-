import { ref, computed, watch } from 'vue'
import { useState } from '#imports'

export interface TaskFilters {
  status: string[]
  priority: string[]
  assignee: string[]
  timeline: string[]
}

// Carregar filtros do localStorage
function loadFiltersFromStorage(boardId: string): TaskFilters {
  if (!import.meta.client) {
    return { status: [], priority: [], assignee: [], timeline: [] }
  }
  
  try {
    const stored = localStorage.getItem(`board-filters-${boardId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[useTaskFilters] Error loading filters from localStorage:', e)
  }
  
  return { status: [], priority: [], assignee: [], timeline: [] }
}

// Salvar filtros no localStorage
function saveFiltersToStorage(boardId: string, filters: TaskFilters) {
  if (!import.meta.client) return
  
  try {
    localStorage.setItem(`board-filters-${boardId}`, JSON.stringify(filters))
  } catch (e) {
    console.error('[useTaskFilters] Error saving filters to localStorage:', e)
  }
}

// Cache de filtros por board
const filtersCache = new Map<string, typeof activeFilters>()

const activeFilters = ref<TaskFilters>({
  status: [],
  priority: [],
  assignee: [],
  timeline: []
})

export function useTaskFilters(boardId?: string) {
  const searchQuery = useState<string>('search:query', () => '')

  // Se boardId foi fornecido, carregar filtros específicos do board
  if (boardId && import.meta.client) {
    // Verificar se já existe no cache
    if (!filtersCache.has(boardId)) {
      const filters = ref(loadFiltersFromStorage(boardId))
      filtersCache.set(boardId, filters)
      
      // Watch para salvar automaticamente quando mudar
      watch(filters, (newFilters) => {
        saveFiltersToStorage(boardId, newFilters)
      }, { deep: true })
    }
    
    // Usar filtros do cache
    const boardFilters = filtersCache.get(boardId)!
    
    const hasActiveFilters = computed(() => {
      return Object.values(boardFilters.value).some(arr => arr.length > 0) || !!searchQuery.value
    })

    function toggleFilter(column: keyof TaskFilters, value: string) {
      const filters = boardFilters.value[column]
      const index = filters.indexOf(value)
      
      if (index > -1) {
        filters.splice(index, 1)
      } else {
        filters.push(value)
      }
    }

    function isFilterActive(column: keyof TaskFilters, value: string) {
      return boardFilters.value[column].includes(value)
    }

    function getActiveFiltersCount(column: keyof TaskFilters) {
      return boardFilters.value[column].length
    }

    function clearFilters() {
      boardFilters.value = {
        status: [],
        priority: [],
        assignee: [],
        timeline: []
      }
    }

    function clearColumnFilters(column: keyof TaskFilters) {
      boardFilters.value[column] = []
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

      // Filtros estruturais (status, prioridade, assignee, timeline)
      const hasStructuralFilters = Object.values(boardFilters.value).some(arr => arr.length > 0)
      if (hasStructuralFilters) {
        filtered = filtered.filter(task => {
          // Filtro de status
          if (boardFilters.value.status.length > 0) {
            if (!task.status_id && !boardFilters.value.status.includes('no-status')) {
              return false
            }
            if (task.status_id && !boardFilters.value.status.includes(task.status_id)) {
              return false
            }
          }

          // Filtro de prioridade
          if (boardFilters.value.priority.length > 0) {
            if (!task.priority_id && !boardFilters.value.priority.includes('no-priority')) {
              return false
            }
            if (task.priority_id && !boardFilters.value.priority.includes(task.priority_id)) {
              return false
            }
          }

          // Filtro de responsável
          if (boardFilters.value.assignee.length > 0) {
            const taskAssigneeIds = task.assignees?.map((a: any) => a.user_id || a.id) || []
            if (taskAssigneeIds.length === 0 && !boardFilters.value.assignee.includes('no-assignee')) {
              return false
            }
            const hasMatchingAssignee = boardFilters.value.assignee.some(filterId => 
              filterId === 'no-assignee' ? taskAssigneeIds.length === 0 : taskAssigneeIds.includes(filterId)
            )
            if (!hasMatchingAssignee) {
              return false
            }
          }

          // Filtro de cronograma
          if (boardFilters.value.timeline.length > 0) {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            let dueDate: Date | null = null
            if (task.due_date) {
              const [year, month, day] = task.due_date.split('-').map(Number)
              dueDate = new Date(year, month - 1, day)
              dueDate.setHours(0, 0, 0, 0)
            }

            let matchesTimeline = false

            for (const filter of boardFilters.value.timeline) {
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
      activeFilters: boardFilters,
      hasActiveFilters,
      toggleFilter,
      isFilterActive,
      getActiveFiltersCount,
      clearFilters,
      clearColumnFilters,
      filterTasks
    }
  }
  
  // Fallback para uso sem boardId (compatibilidade)
  const hasActiveFilters = computed(() => {
    return Object.values(activeFilters.value).some(arr => arr.length > 0) || !!searchQuery.value
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

    // Filtros estruturais (status, prioridade, assignee, timeline)
    const hasStructuralFilters = Object.values(activeFilters.value).some(arr => arr.length > 0)
    if (hasStructuralFilters) {
      filtered = filtered.filter(task => {
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
          const taskAssigneeIds = task.assignees?.map((a: any) => a.user_id || a.id) || []
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
