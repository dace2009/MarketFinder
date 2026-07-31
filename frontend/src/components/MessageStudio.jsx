import { useState, useEffect, useRef } from 'react'
import MessageEditor from './MessageEditor'
import TagManager from './TagManager'

export default function MessageStudio({
  templates, tags,
  onSave, onDelete, onSaveTag, onDeleteTag,
  onGenerateMessage, lead,
}) {
  const [search, setSearch]               = useState('')
  const [filterTags, setFilterTags]       = useState([])
  const [selectedId, setSelectedId]       = useState('')
  const [nombre, setNombre]               = useState('')
  const [cuerpo, setCuerpo]               = useState('')
  const [selectedTags, setSelectedTags]   = useState([])
  const [generating, setGenerating]       = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [showTagPopover, setShowTagPopover] = useState(false)
  const [dirty, setDirty]                 = useState(false)
  const tagPopoverRef = useRef(null)

  useEffect(() => {
    if (selectedId && !dirty) {
      const tpl = templates.find((t) => t.id === selectedId)
      if (tpl) {
        setNombre(tpl.nombre)
        setCuerpo(tpl.cuerpo)
        setSelectedTags(tpl.tags || [])
      }
    }
  }, [selectedId, templates, dirty])

  useEffect(() => {
    function close(e) {
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(e.target)) {
        setShowTagPopover(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleNew = () => {
    setSelectedId('')
    setNombre('')
    setCuerpo('')
    setSelectedTags([])
    setDirty(false)
  }

  const filtered = templates.filter((t) => {
    if (search && !t.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTags.length > 0 && !filterTags.some((ft) => t.tags?.includes(ft))) return false
    return true
  })

  const handleSelect = (id) => {
    if (dirty) {
      const ok = window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')
      if (!ok) return
    }
    setSelectedId(id)
    setDirty(false)
  }

  const handleEditorChange = (val) => {
    setCuerpo(val)
    setDirty(true)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await onGenerateMessage({
        lead_info: lead || {},
        estilos: selectedTags.length > 0 ? selectedTags : undefined,
        plantillas_referencia: templates,
      })
      if (result?.mensaje) {
        setCuerpo(result.mensaje)
        setDirty(true)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!cuerpo.trim()) return
    const data = { nombre: nombre || 'Sin título', cuerpo, tags: selectedTags }
    if (selectedId) data.id = selectedId
    const saved = await onSave(data)
    if (saved?.id) {
      setSelectedId(saved.id)
      setDirty(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    await onDelete(selectedId)
    handleNew()
  }

  const toggleFilterTag = (tagId) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
    setDirty(true)
  }

  const availableTagsForAdd = tags.filter((t) => !selectedTags.includes(t.id))

  return (
    <div className="studio-wrap">

      {/* ── LEFT: template sidebar ──────────────────────────── */}
      <div className="studio-side">

        <input
          className="studio-side-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plantillas…"
        />

        <div className="studio-side-filters">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`studio-sf ${filterTags.includes(tag.id) ? 'active' : ''}`}
              style={{
                background: filterTags.includes(tag.id) ? tag.color : 'transparent',
                color: filterTags.includes(tag.id) ? '#fff' : 'var(--muted)',
                borderColor: tag.color,
              }}
              onClick={() => toggleFilterTag(tag.id)}
            >
              {tag.nombre}
            </button>
          ))}
        </div>

        <div className="studio-tpl-list">
          {filtered.length === 0 ? (
            <p className="studio-no-tpl">
              {search || filterTags.length > 0 ? 'Sin resultados' : 'No hay plantillas'}
            </p>
          ) : (
            filtered.map((tpl) => (
              <div
                key={tpl.id}
                className={`studio-tpl-card ${selectedId === tpl.id ? 'active' : ''}`}
                onClick={() => handleSelect(tpl.id)}
              >
                <div className="studio-tpl-card-name">{tpl.nombre}</div>
                <div className="studio-tpl-card-tags">
                  {tpl.tags?.map((tid) => {
                    const tag = tags.find((t) => t.id === tid)
                    return tag ? (
                      <span key={tid} className="tag-pill-sm" style={{ background: tag.color }}>
                        {tag.nombre}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <button className="studio-new-btn" onClick={handleNew}>+ Nueva plantilla</button>

      </div>

      {/* ── RIGHT: editor hero ──────────────────────────────── */}
      <div className="studio-editor-main">

        <div className="studio-editor-card">

          {/* Name row */}
          <div className="studio-tpl-name-row">
            <input
              className="studio-tpl-name-input"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setDirty(true) }}
              placeholder="Nombre de la plantilla"
            />
            {dirty && <span className="studio-unsaved">Sin guardar</span>}
          </div>

          {/* Message editor (fills remaining space) */}
          <MessageEditor value={cuerpo} onChange={handleEditorChange} />

          {/* Footer: tags + actions */}
          <div className="studio-editor-footer">

            {/* Active tags as chips */}
            {selectedTags.map((tid) => {
              const tag = tags.find((t) => t.id === tid)
              return tag ? (
                <button
                  key={tid}
                  className="tag-pill active"
                  style={{ background: tag.color, color: '#fff', borderColor: tag.color }}
                  onClick={() => toggleTag(tid)}
                  title="Quitar"
                >
                  {tag.nombre} ✕
                </button>
              ) : null
            })}

            {/* Add tag popover */}
            {availableTagsForAdd.length > 0 && (
              <div className="tag-add-wrap" ref={tagPopoverRef}>
                <button
                  className="tag-pill tag-pill-add"
                  onClick={() => setShowTagPopover((o) => !o)}
                >
                  + Añadir
                </button>
                {showTagPopover && (
                  <div className="tag-picker-popover">
                    {availableTagsForAdd.map((tag) => (
                      <button
                        key={tag.id}
                        className="tag-picker-item"
                        onClick={() => { toggleTag(tag.id); setShowTagPopover(false) }}
                      >
                        <span className="tag-picker-dot" style={{ background: tag.color }} />
                        {tag.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Edit tags button */}
            <button
              className="tag-pill"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--muted)' }}
              onClick={() => setShowTagManager(true)}
            >
              ✎ Editar tags
            </button>

            {/* Actions (right side) */}
            <div className="studio-editor-actions">
              <button className="btn-secondary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generando…' : '🤖 IA'}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={!cuerpo.trim()}>
                💾 Guardar
              </button>
              {selectedId && (
                <button className="btn-secondary btn-danger" onClick={handleDelete}>🗑️</button>
              )}
            </div>

          </div>
        </div>
      </div>

      {showTagManager && (
        <TagManager
          tags={tags}
          onSave={onSaveTag}
          onDelete={onDeleteTag}
          onClose={() => setShowTagManager(false)}
        />
      )}

    </div>
  )
}
