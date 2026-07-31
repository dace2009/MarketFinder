import { useState, useRef, useEffect, useCallback } from 'react'

const FIELDS = [
  { key: 'tuNombre',    label: 'Nombre',    icon: '👤', required: true,  type: 'text',  placeholder: 'Ej: Diego Ramírez' },
  { key: 'tuProfesion', label: 'Profesión', icon: '💼', required: true,  type: 'text',  placeholder: 'Ej: Consultor SEO' },
  { key: 'tuTelefono',  label: 'Teléfono',  icon: '📞', required: false, type: 'tel',   placeholder: '5512345678' },
  { key: 'tuMail',      label: 'Correo',    icon: '✉️', required: false, type: 'email', placeholder: 'diego@...' },
  { key: 'tuPortafolio',label: 'Sitio web', icon: '🌐', required: false, type: 'text',  placeholder: 'midigitalagency.com' },
]

export default function UserProfile({
  profile, onChange, accounts, activeId,
  onSwitch, onAddAccount, onLogout,
  onDeleteAccount, confirmDelete, onCancelDelete, onConfirmDelete,
  waStatus, waQr,
}) {
  const [ddOpen, setDdOpen] = useState(false)
  const ddRef = useRef(null)

  // Local draft — lets user type freely; saves to backend on blur
  const [draft, setDraft] = useState(() => profile || {})
  useEffect(() => { setDraft(profile || {}) }, [profile])

  const handleChange = useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleBlur = useCallback(() => {
    onChange(draft)
  }, [onChange, draft])

  const others = accounts.filter((a) => a.id !== activeId)
  const profileComplete = !!(draft.tuNombre && draft.tuProfesion)
  const waConnected = waStatus === 'ready'
  const initial = draft.tuNombre?.charAt(0)?.toUpperCase() || '?'

  useEffect(() => {
    function close(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="profile-split">

      {/* ── LEFT: profile information ──────────────────────── */}
      <div className="profile-left">

        {/* Identity bar */}
        <div className="id-bar">
          <div className="id-avatar">{initial}</div>
          <div className="id-info">
            <h4>
              {draft.tuNombre || 'Sin nombre'}
              {profileComplete
                ? <span className="id-badge id-badge-done"><span className="id-badge-dot" />Perfil completo</span>
                : <span className="id-badge id-badge-warn"><span className="id-badge-dot" />Perfil incompleto</span>
              }
            </h4>
            <div className="id-sub">
              <span>{draft.tuProfesion || '—'}</span>

              {others.length > 0 && (
                <span ref={ddRef} style={{ position: 'relative' }}>
                  <button className="btn-accounts-dd" onClick={() => setDdOpen((o) => !o)}>
                    👤 {accounts.length} cuentas <span className="dd-arrow">▼</span>
                  </button>
                  {ddOpen && (
                    <div className="dd-menu">
                      {others.map((a) => (
                        <button
                          key={a.id}
                          className="dd-item"
                          onClick={() => { onSwitch(a.id); setDdOpen(false) }}
                        >
                          <span className="dd-item-avatar">{a.tuNombre?.charAt(0) || '?'}</span>
                          {a.tuNombre || 'Sin nombre'}
                          <span className="dd-item-tag">{a.tuProfesion || ''}</span>
                        </button>
                      ))}
                      <div className="dd-item dd-divider" />
                      <button className="dd-item dd-add" onClick={() => { onAddAccount(); setDdOpen(false) }}>
                        + Agregar cuenta
                      </button>
                    </div>
                  )}
                </span>
              )}

              <span className={`wa-chip-inline ${waConnected ? 'ready' : 'offline'}`}>
                {waConnected
                  ? <><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.4)', flexShrink: 0 }} />WhatsApp</>
                  : '📱 No conectado'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-pills">
          <div className="stat-pill">
            <span className="sp-num">{accounts.length}</span>
            <span className="sp-txt">Cuentas</span>
          </div>
          <div className="stat-pill">
            <span className="sp-num">{others.length || '—'}</span>
            <span className="sp-txt">Adicionales</span>
          </div>
          <div className="stat-pill">
            <span className={`sp-num ${profileComplete ? 'accent' : ''}`}>
              {profileComplete ? '✓' : '✗'}
            </span>
            <span className="sp-txt">Perfil</span>
          </div>
        </div>

        {/* Fields row */}
        <div className="fields-row">
          {FIELDS.map((f) => (
            <div key={f.key} className="field-pill">
              <span className="fp-icon">{f.icon}</span>
              <div className="fp-wrap">
                <span className="fp-lbl">
                  {f.label}
                  {f.required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
                </span>
                <input
                  type={f.type}
                  className="fp-val"
                  value={draft[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  onBlur={handleBlur}
                  placeholder={f.placeholder}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Experiencia compact */}
        <div className="exp-card">
          <span className="fp-icon">📝</span>
          <div className="fp-wrap">
            <span className="fp-lbl">Experiencia</span>
            <textarea
              className="fp-val"
              value={draft.tuExperiencia || ''}
              onChange={(e) => handleChange('tuExperiencia', e.target.value)}
              onBlur={handleBlur}
              placeholder="Ej: 3 años ayudando a negocios locales…"
              rows={1}
            />
          </div>
        </div>

        {/* Action pills */}
        <div className="action-pills-row">
          <button className="action-pill-btn primary" onClick={onAddAccount}>+ Agregar cuenta</button>
          <button className="action-pill-btn" onClick={onLogout}>Cerrar sesión</button>
          {confirmDelete ? (
            <>
              <button className="action-pill-btn danger" onClick={onConfirmDelete}>Sí, borrar</button>
              <button className="action-pill-btn" onClick={onCancelDelete}>Cancelar</button>
            </>
          ) : (
            <button className="action-pill-btn danger" onClick={onDeleteAccount}>Borrar cuenta</button>
          )}
        </div>

      </div>

      {/* ── RIGHT: QR / WA status panel ────────────────────── */}
      <div className={`profile-right ${waConnected ? 'wa-connected' : ''}`}>
        {waConnected ? (
          <>
            <span className="wa-connected-pill"><span className="wp-dot" />WhatsApp conectado</span>
            <div className="qr-panel-info">
              <h3>Sesión activa</h3>
              <p>Puedes enviar mensajes de acercamiento directamente desde la app.</p>
            </div>
          </>
        ) : waStatus === 'qr' && waQr ? (
          <>
            <div className="qr-panel-img">
              <img src={waQr} alt="QR WhatsApp" />
            </div>
            <div className="qr-panel-info">
              <h3>Conecta WhatsApp</h3>
              <ol className="qr-steps">
                <li><strong>1.</strong> Abre WhatsApp en tu teléfono</li>
                <li><strong>2.</strong> Menú → WhatsApp Web</li>
                <li><strong>3.</strong> Escanea este código</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <div className="qr-panel-placeholder">QR pendiente…</div>
            <div className="qr-panel-info">
              <h3>WhatsApp</h3>
              <p>El código QR aparecerá aquí cuando el servicio esté disponible.</p>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
