import { useState, useEffect, useRef, useMemo } from 'react'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function ApproachChat({
  leads = [],
  onUpdateLeadPhone,
  pendingMessage,
  profile,
  waStatus,
  waQr,
  waMessages,
  waChats = [],
  onSendMessage,
  onGetMessages,
}) {
  const contactedLeads = (leads || []).filter((l) => l?.contacted)
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [inputText, setInputText] = useState('')
  const [editingPhone, setEditingPhone] = useState(null)
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const msgMap = waMessages || {}
  const chatsArr = waChats || []

  const selectedLead = useMemo(
    () => contactedLeads.find((l) => (l?.telefono || '').replace(/[^0-9]/g, '') === selectedPhone),
    [contactedLeads, selectedPhone]
  )

  const messages = selectedPhone ? (msgMap[selectedPhone] || []) : []

  useEffect(() => {
    if (!pendingMessage) return
    const lead = contactedLeads.find((l) => l?.place_id === pendingMessage.leadId)
    if (lead) {
      const phone = (lead.telefono || '').replace(/[^0-9]/g, '')
      if (phone) setSelectedPhone(phone)
    }
    if (pendingMessage.message) setInputText(pendingMessage.message)
  }, [pendingMessage])

  useEffect(() => {
    if (selectedPhone && onGetMessages) onGetMessages(selectedPhone)
  }, [selectedPhone])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim() || !selectedPhone || waStatus !== 'ready') return
    onSendMessage(selectedPhone, inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectChat = (lead) => {
    const phone = (lead?.telefono || '').replace(/[^0-9]/g, '')
    if (phone) {
      setSelectedPhone(phone)
      setInputText('')
    }
  }

  const handleStartEditPhone = (lead) => {
    setEditingPhone(lead?.place_id)
    setEditPhoneValue(lead?.telefono || '')
  }

  const handleSavePhone = (leadId) => {
    const cleaned = editPhoneValue.replace(/[^0-9+ ()-]/g, '').trim()
    if (leadId) onUpdateLeadPhone(leadId, cleaned)
    const newPhone = cleaned.replace(/[^0-9]/g, '')
    if (newPhone) setSelectedPhone(newPhone)
    setEditingPhone(null)
  }

  const getStatusIcon = () => {
    switch (waStatus) {
      case 'ready': return <span className="wa-status-dot wa-status-ready" title="WhatsApp conectado" />
      case 'qr':
      case 'authenticated':
      case 'connected': return <span className="wa-status-dot wa-status-connecting" title="Autenticando…" />
      default: return <span className="wa-status-dot wa-status-offline" title="WhatsApp desconectado" />
    }
  }

  const getStatusLabel = () => {
    switch (waStatus) {
      case 'ready': return 'WhatsApp conectado'
      case 'qr': return 'Escanea el código QR'
      case 'connected': return 'Conectando…'
      case 'authenticated': return 'Autenticando…'
      default: return 'WhatsApp no conectado'
    }
  }

  const findChatForLead = (lead) => {
    const phone = (lead?.telefono || '').replace(/[^0-9]/g, '')
    if (!phone || !chatsArr.length) return null
    try {
      return chatsArr.find((c) => c?.phone && (c.phone === phone || c.phone.includes(phone) || phone.includes(c.phone)))
    } catch { return null }
  }

  if (contactedLeads.length === 0) {
    return (
      <div className="approach-chat approach-chat-empty">
        <div className="results-empty">
          <div className="empty-icon">💬</div>
          <p>No tienes conversaciones activas</p>
          <p className="hint">Los leads que marques como contactados aparecerán aquí</p>
        </div>
      </div>
    )
  }

  return (
    <div className="approach-chat">
      <div className="approach-chat-sidebar">
        <div className="approach-chat-sidebar-header">
          <h3>Acercamiento</h3>
          <span className="results-count">{contactedLeads.length}</span>
        </div>
        <div className="approach-chat-contact-list">
          {contactedLeads.map((lead) => {
            const chat = findChatForLead(lead)
            const lastMsg = chat?.lastMessage
            const phone = (lead?.telefono || '').replace(/[^0-9]/g, '')
            const isActive = selectedPhone === phone

            return (
              <button
                key={lead?.place_id || Math.random()}
                className={`approach-chat-contact ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectChat(lead)}
              >
                <div className="approach-chat-contact-avatar">
                  {(lead?.nombre || '?').charAt(0).toUpperCase()}
                </div>
                <div className="approach-chat-contact-info">
                  <div className="approach-chat-contact-name">{lead?.nombre || 'Sin nombre'}</div>
                  {lastMsg?.body && (
                    <div className="approach-chat-contact-preview">{lastMsg.body.slice(0, 50)}</div>
                  )}
                </div>
                <div className="approach-chat-contact-meta">
                  {lastMsg?.timestamp && <span className="approach-chat-contact-time">{formatDate(lastMsg.timestamp)}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="approach-chat-main">
        {selectedPhone && selectedLead ? (
          <>
            <div className="approach-chat-header">
              <div className="approach-chat-header-left">
                <div className="approach-chat-contact-avatar approach-chat-header-avatar">
                  {(selectedLead?.nombre || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="approach-chat-header-name">{selectedLead?.nombre || 'Sin nombre'}</div>
                  <div className="approach-chat-header-phone">
                    {editingPhone === selectedLead?.place_id ? (
                      <span className="approach-chat-phone-edit">
                        <input
                          value={editPhoneValue}
                          onChange={(e) => setEditPhoneValue(e.target.value)}
                          onBlur={() => handleSavePhone(selectedLead?.place_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePhone(selectedLead?.place_id)
                            if (e.key === 'Escape') setEditingPhone(null)
                          }}
                          autoFocus
                          className="approach-chat-phone-input"
                        />
                        <button className="btn-sm" onClick={() => handleSavePhone(selectedLead?.place_id)}>✓</button>
                      </span>
                    ) : (
                      <span>
                        {selectedLead?.telefono || 'Sin teléfono'}
                        <button className="btn-icon-edit" onClick={() => handleStartEditPhone(selectedLead)} title="Editar teléfono">✏️</button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="approach-chat-header-status">
                {getStatusIcon()}
                <span className="wa-status-label">{getStatusLabel()}</span>
              </div>
            </div>

            <div className="approach-chat-messages">
              {messages.length === 0 && (
                <div className="approach-chat-empty-state">
                  {waStatus === 'ready'
                    ? <p>No hay mensajes aún. Escribe el primero.</p>
                    : <p>Esperando conexión con WhatsApp…</p>
                  }
                </div>
              )}
              {messages.map((m, i) => (
                <div key={m?.id || i} className={`approach-chat-bubble ${m?.fromMe ? 'sent' : 'received'}`}>
                  <div className="approach-chat-bubble-text">{m?.body || ''}</div>
                  <div className="approach-chat-bubble-time">
                    {m?.timestamp ? formatTime(m.timestamp) : ''}
                    {m?.fromMe && <span className="approach-chat-bubble-check"> ✓</span>}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="approach-chat-input-area">
              <textarea
                ref={inputRef}
                className="approach-chat-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={waStatus === 'ready' ? 'Escribe un mensaje…' : 'WhatsApp no disponible…'}
                rows={2}
                disabled={waStatus !== 'ready'}
              />
              <button
                className="approach-chat-send-btn"
                onClick={handleSend}
                disabled={!inputText.trim() || waStatus !== 'ready'}
                title="Enviar mensaje"
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="approach-chat-no-selection">
            <div className="empty-icon">💬</div>
            <p>Selecciona un contacto para iniciar la conversación</p>
            <div className="approach-chat-status-bar">
              {getStatusIcon()}
              <span>{getStatusLabel()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
