const SERVICE_ICONS = {
  'Diseño de sitio web': '🌐',
  'Gestión de redes sociales': '📱',
  'Fotografía profesional': '📷',
  'Diseño de logotipo': '🎨',
  'Publicidad digital': '📣',
  'Fotografía de productos': '🛍️',
  'Tarjetas de presentación': '💼',
  'Email marketing': '📧',
  'Branding': '✨',
  'Diseño de menú': '📋',
}

const STATUS = {
  activo:               { dot: '#16a34a', label: 'Activo' },
  posiblemente_cerrado: { dot: '#f59e0b', label: 'Posiblemente cerrado' },
  cerrado:              { dot: '#dc2626', label: 'Cerrado' },
  desconocido:          { dot: '#9ca3af', label: 'Sin confirmar' },
}

export default function SmartResultCard({ place, onSave, onRemove, isSaved, onClick }) {
  const status = STATUS[place.estado_operativo] || STATUS.desconocido

  const domain = place.sitio_web
    ? place.sitio_web.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : null

  return (
    <div className="smart-card" onClick={onClick} style={{ cursor: 'pointer' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="smart-card-header">
        <div className="smart-name-row">
          <h3 className="smart-name">{place.nombre}</h3>
          <button
            className={`btn-save-lead ${isSaved ? 'saved' : ''}`}
            onClick={(e) => { e.stopPropagation(); isSaved ? onRemove(place.place_id) : onSave(place) }}
            title={isSaved ? 'Quitar de guardados' : 'Guardar lead'}
          >
            {isSaved ? '★ Guardado' : '☆ Guardar'}
          </button>
        </div>

        <div className="smart-header-meta">
          {place.calificacion > 0 && (
            <span className="smart-rating">★ {place.calificacion.toFixed(1)}</span>
          )}
          {place.total_resenas > 0 && (
            <span className="smart-rev-count">{place.total_resenas.toLocaleString()} reseñas</span>
          )}
          <span className="smart-status">
            <span className="smart-status-dot" style={{ background: status.dot }} />
            {status.label}
          </span>
        </div>
      </div>

      {/* ── Datos de contacto ──────────────────────────────────────── */}
      <div className="smart-contact">
        {place.direccion_completa && (
          <div className="smart-row">
            <span className="smart-icon">📍</span>
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {place.direccion_completa}
            </a>
          </div>
        )}
        {place.telefono && (
          <div className="smart-row">
            <span className="smart-icon">📞</span>
            <a href={`tel:${place.telefono}`} onClick={(e) => e.stopPropagation()}>{place.telefono}</a>
          </div>
        )}
        <div className="smart-row">
          <span className="smart-icon">🌐</span>
          {domain
            ? <a href={place.sitio_web} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{domain}</a>
            : <span className="smart-none">Sin sitio web</span>}
        </div>
      </div>

      {/* ── Redes sociales ─────────────────────────────────────────── */}
      <div className="smart-social">
        {place.facebook
          ? <a href={place.facebook} target="_blank" rel="noopener noreferrer" className="social-card facebook" onClick={(e) => e.stopPropagation()}>Facebook</a>
          : <span className="social-card social-na">Facebook N/A</span>}
        {place.instagram
          ? <a href={place.instagram} target="_blank" rel="noopener noreferrer" className="social-card instagram" onClick={(e) => e.stopPropagation()}>Instagram</a>
          : <span className="social-card social-na">Instagram N/A</span>}
      </div>

      {/* ── Reseñas ────────────────────────────────────────────────── */}
      {place.resenas?.length > 0 && (
        <div className="smart-reviews">
          <p className="smart-section-label">Reseñas</p>
          {place.resenas.slice(0, 2).map((r, i) => (
            <div key={i} className="smart-review">
              <div className="smart-review-top">
                <strong>{r.autor}</strong>
                <span className="review-rating">
                  {'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}
                </span>
                <span className="review-time">{r.tiempo}</span>
              </div>
              {r.texto && (
                <p className="smart-review-text">
                  {r.texto.length > 140 ? r.texto.slice(0, 140) + '…' : r.texto}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Servicios sugeridos ────────────────────────────────────── */}
      {place.servicios_sugeridos?.length > 0 && (
        <div className="smart-services">
          <p className="smart-section-label">Servicios que podría necesitar</p>
          <div className="smart-tags">
            {place.servicios_sugeridos.map((s, i) => (
              <span key={i} className="smart-tag">
                {SERVICE_ICONS[s] || '•'} {s}
              </span>
            ))}
          </div>
        </div>
      )}


    </div>
  )
}
