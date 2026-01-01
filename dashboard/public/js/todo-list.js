/**
 * Todo List Frontend Module
 *
 * Displays current work from Quinn's agendas
 * Shows agent tasks, deadlines, and status
 * Polls /api/todos every 60 seconds
 */

console.log('Todo list module loading...')

const TODOS_UPDATE_INTERVAL = 60 * 1000 // 60 seconds
let todosUpdateTimer = null

export function initTodoList() {
  console.log('Initializing todo list')
  fetchAndRenderTodos()
  todosUpdateTimer = setInterval(fetchAndRenderTodos, TODOS_UPDATE_INTERVAL)
}

async function fetchAndRenderTodos() {
  try {
    const response = await fetch('/api/todos')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    renderTodos(data)
  } catch (error) {
    console.error('Todos fetch error:', error)
    renderTodosError(error.message)
  }
}

function renderTodos(data) {
  const container = document.getElementById('todo-card')
  if (!container) return

  const tasks = data.currentWork || []
  const tasksHtml = tasks.map(task => `
    <div style="padding: 12px; border-left: 4px solid ${getStatusColor(task.status)}; background: #f9f9f9; margin-bottom: 10px; border-radius: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600; font-size: 13px; color: #3d2817; margin-bottom: 2px;">
            ${task.task}
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
            ${task.agent} • ${task.role}
          </div>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px; background: ${getStatusBgColor(task.status)}; color: white;">
            ${task.status}
          </span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999;">
        <div>Deadline: <strong>${task.deadline}</strong></div>
        ${task.blocker ? `<div style="color: #8b0000;">⚠ ${task.blocker}</div>` : ''}
      </div>
    </div>
  `).join('')

  const html = `
    <h2>Current Work (Quinn)</h2>
    <div style="font-size: 12px; color: #666; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
      📋 ${data.agendaDate}
    </div>
    ${tasksHtml || '<div style="text-align: center; color: #999; padding: 20px;">No tasks</div>'}
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
      Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
    </div>
  `

  container.innerHTML = html
}

function renderTodosError(message) {
  const container = document.getElementById('todo-card')
  if (!container) return

  container.innerHTML = `
    <h2>Current Work (Quinn)</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Todos</div>
      <div style="font-size: 13px; color: #666;">${message}</div>
    </div>
  `
}

function getStatusColor(status) {
  switch (status) {
    case 'ON_TRACK': return '#2d5016'
    case 'AT_RISK': return '#a85c00'
    case 'BLOCKED': return '#8b0000'
    default: return '#999'
  }
}

function getStatusBgColor(status) {
  switch (status) {
    case 'ON_TRACK': return '#2d5016'
    case 'AT_RISK': return '#a85c00'
    case 'BLOCKED': return '#8b0000'
    default: return '#999'
  }
}

export function destroyTodoList() {
  if (todosUpdateTimer) clearInterval(todosUpdateTimer)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTodoList)
} else {
  initTodoList()
}

console.log('Todo list module loaded')
