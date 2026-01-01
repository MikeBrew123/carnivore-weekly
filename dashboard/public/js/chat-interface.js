/**
 * Chat Interface Frontend Module
 *
 * Provides chat interface to ask questions about Quinn/Leo/Project
 * Supports conversation history and auto-context detection
 */

console.log('Chat interface module loading...')

let currentConversationId = null
let isLoading = false

export function initChat() {
  console.log('Initializing chat interface')

  const chatInput = document.getElementById('chat-input')
  const chatSend = document.getElementById('chat-send')
  const chatMessages = document.getElementById('chat-messages')

  if (!chatInput || !chatSend || !chatMessages) {
    console.warn('Chat elements not found')
    return
  }

  // Show initial message
  appendMessage({
    role: 'assistant',
    content: 'Hi! Ask me about Quinn\'s documentation, Leo\'s database, the project, or team skills. I\'ll explain everything in simple language.'
  })

  chatSend.addEventListener('click', () => {
    sendMessage()
  })

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
}

async function sendMessage() {
  const chatInput = document.getElementById('chat-input')
  const message = chatInput.value.trim()

  if (!message || isLoading) return

  isLoading = true
  appendMessage({ role: 'user', content: message })
  chatInput.value = ''
  chatInput.disabled = true

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: currentConversationId
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    currentConversationId = data.conversationId

    appendMessage({
      role: 'assistant',
      content: data.reply
    })
  } catch (error) {
    console.error('Chat error:', error)
    appendMessage({
      role: 'assistant',
      content: `⚠ Error: ${error.message}`
    })
  } finally {
    isLoading = false
    chatInput.disabled = false
    chatInput.focus()
  }
}

function appendMessage(message) {
  const chatMessages = document.getElementById('chat-messages')
  if (!chatMessages) return

  const messageEl = document.createElement('div')
  messageEl.style.cssText = `
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.5;
    ${message.role === 'user' ? 'background: #e8f5e9; margin-left: 20px; text-align: right;' : 'background: #f5f5f5; margin-right: 20px;'}
  `

  // For assistant messages, render markdown; for user messages, just show text
  if (message.role === 'assistant' && typeof marked !== 'undefined') {
    messageEl.innerHTML = marked.parse(message.content)
    // Add styles for markdown elements
    messageEl.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      el.style.marginTop = '12px'
      el.style.marginBottom = '8px'
      el.style.fontWeight = 'bold'
    })
    messageEl.querySelectorAll('code').forEach(el => {
      el.style.background = '#eee'
      el.style.padding = '2px 4px'
      el.style.borderRadius = '3px'
      el.style.fontFamily = 'monospace'
      el.style.fontSize = '12px'
    })
    messageEl.querySelectorAll('pre').forEach(el => {
      el.style.background = '#f0f0f0'
      el.style.padding = '8px'
      el.style.borderRadius = '4px'
      el.style.overflow = 'auto'
      el.style.marginTop = '8px'
      el.style.marginBottom = '8px'
    })
    messageEl.querySelectorAll('table').forEach(el => {
      el.style.borderCollapse = 'collapse'
      el.style.width = '100%'
      el.style.marginTop = '8px'
      el.style.marginBottom = '8px'
    })
    messageEl.querySelectorAll('th, td').forEach(el => {
      el.style.border = '1px solid #ddd'
      el.style.padding = '6px'
      el.style.textAlign = 'left'
    })
    messageEl.querySelectorAll('th').forEach(el => {
      el.style.background = '#f0f0f0'
      el.style.fontWeight = 'bold'
    })
    messageEl.querySelectorAll('ul, ol').forEach(el => {
      el.style.marginLeft = '16px'
      el.style.marginTop = '4px'
      el.style.marginBottom = '4px'
    })
  } else {
    messageEl.textContent = message.content
  }

  chatMessages.appendChild(messageEl)

  // Auto-scroll to bottom
  chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight
}

export function destroyChat() {
  // Cleanup if needed
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat)
} else {
  initChat()
}

console.log('Chat interface module loaded')
