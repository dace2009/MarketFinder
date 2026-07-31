const STATUS_LABELS = {
  activo: 'Activo',
  posiblemente_cerrado: 'Posiblemente cerrado',
  cerrado: 'Cerrado',
  desconocido: 'Estado desconocido',
}

export default function PlaceDetail({ place, onClose, onSave, onRemove, isSaved,
  researchResult, researchLoading, onToggleContacted,
  onOpenMessagePanel, messagePanelOpen }) {
  const est = place.clientes_estimados || {}
  const opp = place.oportunidad || {}
  const priceSymbols = ['', '$', '$$', '$$$', '$$$$']

  return (
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="modal-sticky-header">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header-row">
          <h2>
            {place.nombre}
            {place.contacted && <span className="contacted-badge">Contactado ✓</span>}
          </h2>
          <div className="modal-header-actions">
            {isSaved ? (
              <button className="btn-save-lead saved" onClick={() => onRemove(place.place_id)}>★ Guardado</button>
            ) : (
              <button className="btn-save-lead" onClick={() => onSave(place)}>☆ Guardar lead</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="modal-body">

        {/* Plan message CTA */}
        {onOpenMessagePanel && (
          <div className="plan-msg-bar">
            <button
              className={`btn-plan-full ${messagePanelOpen ? 'active' : ''}`}
              onClick={onOpenMessagePanel}
            >
              {messagePanelOpen ? '✕ Cerrar planificador' : 'Planear mensaje'}
            </button>
          </div>
        )}

        {/* Opportunity Score */}
        {opp.puntaje !== undefined && (
          <section className="detail-section opp-section">
            <h3>Puntaje de oportunidad</h3>
            <div className="opp-header">
              <div className={`opp-score score-${(opp.nivel || '').toLowerCase().replace(' ', '-')}`}>
                <span className="opp-value">{opp.puntaje}</span>
                <span className="opp-label">/100</span>
              </div>
              <div className="opp-level">{opp.nivel}</div>
            </div>
            {opp.factores && opp.factores.length > 0 && (
              <div className="opp-factors">
                {opp.factores.map((f, i) => (
                  <div key={i} className={`opp-factor ${f.puntos > 0 ? 'positive' : f.puntos < 0 ? 'negative' : 'neutral'}`}>
                    <span className="factor-icon">{f.icono}</span>
                    <span className="factor-text">{f.factor}</span>
                    <span className="factor-points">{f.puntos > 0 ? `+${f.puntos}` : f.puntos}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="detail-grid">
          <section className="detail-section">
            <h3>Información general</h3>
            <dl>
              {place.direccion_completa && (
                <><dt>Dirección</dt><dd>{place.direccion_completa}</dd></>
              )}
              {place.telefono && (
                <><dt>Teléfono</dt><dd><a href={`tel:${place.telefono}`}>{place.telefono}</a></dd></>
              )}
              {place.sitio_web && (
                <><dt>Sitio web</dt><dd><a href={place.sitio_web} target="_blank" rel="noopener noreferrer">{place.sitio_web.replace(/^https?:\/\//, '')}</a></dd></>
              )}
              {place.calificacion && (
                <><dt>Calificación</dt><dd>
                  <span className="rating-big">★ {place.calificacion.toFixed(1)}</span>
                  <span className="rating-count">({place.total_resenas} reseñas)</span>
                </dd></>
              )}
              {place.precio > 0 && (
                <><dt>Nivel de precio</dt><dd>{priceSymbols[place.precio] || 'N/A'}</dd></>
              )}
              {place.url_maps && (
                <><dt>Google Maps</dt><dd><a href={place.url_maps} target="_blank" rel="noopener noreferrer">Ver en Google Maps →</a></dd></>
              )}
              {place.plus_code && (
                <><dt>Plus Code</dt><dd>{place.plus_code}</dd></>
              )}
              {researchLoading && (
                <><dt>Redes sociales</dt><dd className="ai-inline-loading">Buscando<span className="ai-dots" /></dd></>
              )}
              {!researchLoading && researchResult && (researchResult.facebook || researchResult.instagram || researchResult.otros_links?.length > 0) && (
                <><dt>Redes sociales</dt>
                <dd className="social-links-inline">
                  {researchResult.facebook && (
                    <a href={researchResult.facebook} target="_blank" rel="noopener noreferrer" className="social-card facebook">Facebook</a>
                  )}
                  {researchResult.instagram && (
                    <a href={researchResult.instagram} target="_blank" rel="noopener noreferrer" className="social-card instagram">Instagram</a>
                  )}
                  {(researchResult.otros_links || []).slice(0, 3).map((url, i) => {
                    let host = url
                    try { host = new URL(url).hostname } catch {}
                    return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="social-card otros">{host}</a>
                  })}
                </dd></>
              )}
            </dl>
          </section>

          <section className="detail-section">
            <h3>Análisis de mercado</h3>
            <dl>
              <dt>¿Tiene sitio web?</dt><dd>{place.tiene_sitio_web ? 'Sí' : 'No'}</dd>
              {place.cadena && (
                <><dt>Cadena / Franquicia</dt><dd>{place.cadena.es_cadena ? `Sí (${place.cadena.confianza === 'alto' ? 'Seguro' : 'Posible'})` : 'No'}</dd></>
              )}
              {place.idioma && (
                <><dt>Idioma del negocio</dt><dd>{place.idioma}</dd></>
              )}
              {est.total_resenas !== undefined && (
                <><dt>Total de reseñas</dt><dd>{est.total_resenas.toLocaleString()}</dd></>
              )}
              {est.calificacion > 0 && (
                <><dt>Calificación promedio</dt><dd>{est.calificacion.toFixed(1)} / 5.0</dd></>
              )}
              {est.estimado_mensual > 0 && (
                <><dt>Clientes estimados/mes</dt><dd className="estimate-highlight">~{est.estimado_mensual.toLocaleString()}</dd></>
              )}
              {est.nivel && (
                <><dt>Nivel de popularidad</dt><dd><span className={`popularity-badge ${est.nivel.toLowerCase().replace(' ', '-')}`}>{est.nivel}</span></dd></>
              )}
              {place.tipos && place.tipos.length > 0 && (
                <><dt>Categorías</dt><dd className="tags">{place.tipos.map((t) => <span key={t} className="tag">{t}</span>)}</dd></>
              )}
              {researchLoading && (
                <><dt>Estado operativo</dt><dd className="ai-inline-loading">Analizando<span className="ai-dots" /></dd></>
              )}
              {!researchLoading && researchResult?.estado_operativo && (
                <><dt>Estado operativo</dt>
                <dd><span className={`estado-badge estado-${researchResult.estado_operativo}`}>
                  {STATUS_LABELS[researchResult.estado_operativo] || researchResult.estado_operativo}
                </span></dd></>
              )}
              {!researchLoading && researchResult?.hallazgos?.length > 0 && (
                <><dt>Hallazgos</dt>
                <dd><ul className="hallazgos-list">
                  {researchResult.hallazgos.map((h, i) => <li key={i}>{h}</li>)}
                </ul></dd></>
              )}
            </dl>
          </section>
        </div>

        {place.horarios && place.horarios.length > 0 && (
          <section className="detail-section horarios">
            <h3>Horarios de atención</h3>
            <table className="hours-table">
              <tbody>
                {place.horarios.map((h, i) => {
                  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                  const [day, ...hours] = h.split(': ')
                  return (
                    <tr key={i}>
                      <td className="hour-day">{days[i] || day}</td>
                      <td className="hour-time">{hours.join(': ')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {place.resenas && place.resenas.length > 0 && (
          <section className="detail-section resenas">
            <h3>Reseñas destacadas</h3>
            <div className="reviews-list">
              {place.resenas.map((r, i) => (
                <div key={i} className="review-card">
                  <div className="review-header">
                    <strong>{r.autor}</strong>
                    <span className="review-rating">{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</span>
                    <span className="review-time">{r.tiempo}</span>
                  </div>
                  {r.texto && <p className="review-text">{r.texto}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

      </div>
    </div>
  )
}
