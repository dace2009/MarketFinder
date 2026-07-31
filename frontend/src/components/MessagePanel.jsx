import { useState } from 'react'
import MessageEditor from './MessageEditor'

export default function MessagePanel({
  lead, templates, profile,
  onGenerateMessage, onClose, onSendToWhatsApp,
}) {
  const [cuerpo, setCuerpo] = useState(() => lead?.mensaje_acercamiento || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    if (tpl) setCuerpo(tpl.cuerpo)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await onGenerateMessage({
        lead_info: lead || {},
        plantillas_referencia: templates,
        profile,
      })
      if (result?.mensaje) setCuerpo(result.mensaje)
    } finally {
      setGenerating(false)
    }
  }

  const handleSendWhatsApp = () => {
    if (!lead) return
    onSendToWhatsApp(lead, cuerpo)
    onClose()
  }

  return (
    <>
      <div className="message-panel-header">
        <h3>Planear mensaje</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="message-panel-body">
        <div className="mp-section">
          <label className="mp-label">Plantilla base</label>
          <select
            className="mp-select"
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
          >
            <option value="">— Nueva —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <div className="mp-section mp-section-grow">
          <label className="mp-label">Mensaje</label>
          <MessageEditor value={cuerpo} onChange={setCuerpo} />
        </div>
      </div>

      <div className="message-panel-footer">
        <button className="btn-secondary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generando…' : '🤖 Generar con IA'}
        </button>
        <button className="btn-primary" onClick={handleSendWhatsApp}>
          📤 Enviar a WhatsApp
        </button>
      </div>
    </>
  )
}
