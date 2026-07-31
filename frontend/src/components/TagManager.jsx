import { useState } from 'react'

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#8b5cf6', '#6b7280',
  '#84cc16', '#06b6d4', '#d946ef', '#a855f7', '#e11d48',
]

export default function TagManager({ tags, onSave, onDelete, onClose }) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) { setError('El nombre es obligatorio'); return }
    if (trimmed.length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return }
    setError('')
    try {
      await onSave(editingId ? { id: editingId, nombre: trimmed, color } : { nombre: trimmed, color })
      setNombre('')
      setColor(PRESET_COLORS[0])
      setEditingId(null)
    } catch {
      setError('Error al guardar el tag')
    }
  }

  const handleEdit = (tag) => {
    setEditingId(tag.id)
    setNombre(tag.nombre)
    setColor(tag.color)
    setError('')
  }

  const handleCancel = () => {
    setNombre('')
    setColor(PRESET_COLORS[0])
    setEditingId(null)
    setError('')
  }

  return (
    <div className="tag-manager-overlay" onClick={onClose}>
      <div className="tag-manager" onClick={(e) => e.stopPropagation()}>
        <div className="tag-manager-header">
          <h3>Administrar tags</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="tag-manager-form" onSubmit={handleSubmit}>
          <div className="tag-form-row">
            <input
              className="tag-form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del tag"
            />
            <div className="tag-color-picker">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tag-color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <button type="submit" className="btn-sm">
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
            {editingId && (
              <button type="button" className="btn-sm btn-cancel" onClick={handleCancel}>
                Cancelar
              </button>
            )}
          </div>
          {error && <p className="tag-form-error">{error}</p>}
        </form>

        <div className="tag-manager-list">
          {tags.length === 0 ? (
            <p className="tag-manager-empty">No hay tags creados</p>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="tag-manager-item">
                <span className="tag-pill" style={{ background: tag.color, color: '#fff' }}>
                  {tag.nombre}
                </span>
                <div className="tag-manager-item-actions">
                  <button className="btn-icon-sm" onClick={() => handleEdit(tag)} title="Editar">✏️</button>
                  <button className="btn-icon-sm" onClick={() => onDelete(tag.id)} title="Eliminar">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
