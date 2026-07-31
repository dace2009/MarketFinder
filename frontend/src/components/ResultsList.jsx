function ScoreBadge({ puntaje, nivel }) {
  const colors = {
    'Muy alto': { bg: '#dcfce7', text: '#166534' },
    'Alto': { bg: '#dbeafe', text: '#1e40af' },
    'Medio': { bg: '#fef9c3', text: '#854d0e' },
    'Bajo': { bg: '#f3f4f6', text: '#6b7280' },
  }
  const c = colors[nivel] || colors.Bajo
  return (
    <span className="score-badge" style={{ background: c.bg, color: c.text }}>
      <span className="score-value">{puntaje}</span>
      <span className="score-label">{nivel}</span>
    </span>
  )
}

export default function ResultsList({
  results,
  searchDone,
  loading,
  onViewDetail,
  nextPageToken,
  onLoadMore,
  loadingMore,
  onSave,
  onRemove,
  isSaved,
}) {
  if (loading) {
    return (
      <div className="results-panel">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analizando negocios en un radio de 20 km...</p>
          <p className="hint">Aplicando filtros inteligentes</p>
        </div>
      </div>
    )
  }

  if (!searchDone) {
    return (
      <div className="results-panel">
        <div className="results-empty">
          <div className="empty-icon">🎯</div>
          <p>Selecciona un tipo de negocio y haz clic en <strong>Buscar</strong></p>
          <p className="hint">Los filtros inteligentes descartarán automáticamente cadenas y negocios con sitio web</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="results-panel">
        <div className="results-empty">
          <div className="empty-icon">🔍</div>
          <p>No se encontraron candidatos en esta área.</p>
          <p className="hint">Prueba con otro tipo de negocio, cambia la ubicación o desactiva algunos filtros</p>
        </div>
      </div>
    )
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h3>Posibles clientes</h3>
        <span className="results-count">{results.length} candidatos</span>
      </div>

      <div className="results-list">
        {results.map((place) => {
          const opp = place.oportunidad || {}
          const saved = isSaved(place.place_id)
          return (
            <div
              key={place.place_id}
              className={`result-card ${saved ? 'saved' : ''}`}
              onClick={() => onViewDetail(place.place_id)}
            >
              <div className="card-top">
                <ScoreBadge puntaje={opp.puntaje} nivel={opp.nivel} />
                <div className="card-save">
                  {saved ? (
                    <button
                      className="btn-icon saved"
                      onClick={(e) => { e.stopPropagation(); onRemove(place.place_id) }}
                      title="Quitar de guardados"
                    >
                      ★
                    </button>
                  ) : (
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.stopPropagation(); onSave(place) }}
                      title="Guardar lead"
                    >
                      ☆
                    </button>
                  )}
                </div>
              </div>

              <h4 className="card-name">{place.nombre}</h4>

              <div className="card-meta">
                {place.calificacion && (
                  <span className="meta-rating">
                    {'★'} {place.calificacion.toFixed(1)}
                  </span>
                )}
                {place.total_resenas > 0 && (
                  <span className="meta-reviews">{place.total_resenas} reseñas</span>
                )}
              </div>

              <div className="card-info">
                {place.direccion && (
                  <p className="card-address">{place.direccion}</p>
                )}
                {place.telefono && (
                  <p className="card-phone">{place.telefono}</p>
                )}
              </div>

              <div className="card-badges">
                {!place.tiene_sitio_web && (
                  <span className="badge badge-no-web">Sin sitio web</span>
                )}
                {place.cadena?.es_cadena && place.cadena?.confianza === 'bajo' && (
                  <span className="badge badge-chain">Posible cadena</span>
                )}
                {place.idioma && place.idioma !== 'Desconocido' && (
                  <span className="badge badge-lang">{place.idioma}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {nextPageToken && (
        <button
          className="btn-load-more"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Cargando...' : 'Cargar más resultados'}
        </button>
      )}
    </div>
  )
}
