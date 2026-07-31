import { useState, useRef, useEffect } from 'react'

const PLACEHOLDER_OPTIONS = [
  { label: '[Negocio]', value: '[Negocio]' },
  { label: '[Tu Nombre]', value: '[Tu Nombre]' },
  { label: '[Tu Profesión]', value: '[Tu Profesión]' },
  { label: '[Tu Experiencia]', value: '[Tu Experiencia]' },
  { label: '[Tu Portafolio]', value: '[Tu Portafolio]' },
  { label: '[Tu Mail]', value: '[Tu Mail]' },
  { label: '[Tu Teléfono]', value: '[Tu Teléfono]' },
  { label: '[Servicio/Producto]', value: '[Servicio/Producto]' },
  { label: '[Tema/Servicio]', value: '[Tema/Servicio]' },
]

export default function MessageEditor({ value, onChange, placeholder = 'Escribe tu mensaje aquí…' }) {
  const textareaRef = useRef(null)
  const [showPlaceholders, setShowPlaceholders] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowPlaceholders(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const insertPlaceholder = (ph) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.substring(0, start)
    const after = value.substring(end)
    const next = before + ph + after
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + ph.length, start + ph.length)
    })
    setShowPlaceholders(false)
  }

  return (
    <div className="message-editor-wrap">
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <div className="placeholder-dropdown-wrap" ref={menuRef}>
            <button
              className="btn-placeholder-toggle"
              onClick={() => setShowPlaceholders((p) => !p)}
            >
              [+] Insertar placeholder
            </button>
            {showPlaceholders && (
              <div className="placeholder-menu">
                {PLACEHOLDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="placeholder-option"
                    onClick={() => insertPlaceholder(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="editor-char-count">{value.length} caracteres</span>
      </div>
      <textarea
        ref={textareaRef}
        className="message-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
      />
    </div>
  )
}
