import { useState } from 'react'
import MessagePanel from './MessagePanel'

const FILTERS = [
  { id: 'all',       label: 'Todos' },
  { id: 'no-web',    label: 'Sin web' },
  { id: 'high',      label: 'Score alto' },
  { id: 'pending',   label: 'No contactado' },
]

function scoreClass(puntaje) {
  if (!puntaje) return 'low'
  if (puntaje >= 70) return 'high'
  if (puntaje >= 40) return 'mid'
  return 'low'
}

export default function SavedLeads({
  leads, onViewDetail, onRemove, onClear, onToggleContacted,
  templates, tags, profile,
  onSaveTemplate, onDeleteTemplate, onSaveTag, onDeleteTag,
  onGenerateMessage, onSendToWhatsApp,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [messagePanelPlaceId, setMessagePanelPlaceId] = useState(null)

  const filtered = leads.filter((place) => {
    if (search && !place.nombre?.toLowerCase().includes(search.toLowerCase())) return false
    if (activeFilter === 'no-web'  && place.tiene_sitio_web) return false
    if (activeFilter === 'high'    && (place.oportunidad?.puntaje || 0) < 70) return false
    if (activeFilter === 'pending' && place.contacted) return false
    return true
  })

  const messageLead = messagePanelPlaceId
    ? leads.find((l) => l.place_id === messagePanelPlaceId)
    : null

  if (leads.length === 0) {
    return (
      <div className="leads-bento-panel">
        <div className="leads-empty-state">
          <div style={{ fontSize: '2rem', opacity: 0.3 }}>📋</div>
          <p>No tienes leads guardados</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Los leads que guardes aparecerán aquí</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leads-bento-panel">

      {/* Filter bar */}
      <div className="leads-filter-bar">
        <span className="leads-filter-title">⭐ {leads.length} leads</span>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`leads-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <input
          className="leads-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar lead…"
        />
      </div>

      {/* Cards row */}
      <div className="leads-cards-row">
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', color: 'var(--muted)', fontSize: '0.8rem' }}>
            Sin resultados para ese filtro.
          </div>
        ) : (
          filtered.map((place) => {
            const opp = place.oportunidad || {}
            const cls = scoreClass(opp.puntaje)
            return (
              <div
                key={place.place_id}
                className="lead-bento-card"
                onClick={() => onViewDetail(place.place_id)}
              >
                <span className={`lead-score-dot ${cls}`}>{opp.puntaje || '?'}</span>

                <div className="lead-body">
                  <div className="lead-name">
                    {place.nombre}
                    {place.contacted && (
                      <span style={{ fontSize: '0.5rem', color: '#4ade80', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '99px', padding: '1px 8px', fontWeight: 600 }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="lead-meta">
                    {place.calificacion && <span className="lead-rating">★ {place.calificacion.toFixed(1)}</span>}
                    {place.total_resenas > 0 && <span>{place.total_resenas} reseñas</span>}
                  </div>
                  {(place.direccion || place.telefono) && (
                    <div className="lead-detail">
                      {place.direccion && <span>{place.direccion}</span>}
                      {place.telefono && <span> · {place.telefono}</span>}
                    </div>
                  )}
                </div>

                {!place.tiene_sitio_web && (
                  <span className="lead-tag-pill">Sin web</span>
                )}

                <div className="lead-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="lead-btn lead-saved"
                    onClick={() => onRemove(place.place_id)}
                    title="Quitar de guardados"
                  >★</button>
                  {onToggleContacted && (
                    <button
                      className={`lead-btn ${place.contacted ? 'lead-contacted' : ''}`}
                      onClick={() => onToggleContacted(place.place_id, !place.contacted)}
                      title={place.contacted ? 'Marcar como no contactado' : 'Marcar como contactado'}
                    >
                      {place.contacted ? '✓' : '○'}
                    </button>
                  )}
                  {onSendToWhatsApp && (
                    <button
                      className="lead-btn lead-plan-btn"
                      onClick={() => setMessagePanelPlaceId(
                        messagePanelPlaceId === place.place_id ? null : place.place_id
                      )}
                      title="Planear mensaje"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Inline message panel */}
      {messageLead && (
        <div className="leads-message-panel-card">
          <MessagePanel
            lead={messageLead}
            templates={templates || []}
            tags={tags || []}
            profile={profile}
            onSave={onSaveTemplate}
            onDelete={onDeleteTemplate}
            onSaveTag={onSaveTag}
            onDeleteTag={onDeleteTag}
            onGenerateMessage={onGenerateMessage}
            onClose={() => setMessagePanelPlaceId(null)}
            onSendToWhatsApp={onSendToWhatsApp}
          />
        </div>
      )}

      {/* Bottom actions */}
      <div className="leads-actions-bar">
        <button className="action-pill-btn danger" onClick={onClear}>
          Limpiar todos los leads
        </button>
      </div>

    </div>
  )
}

