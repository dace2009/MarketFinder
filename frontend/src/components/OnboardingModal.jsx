import { useState } from 'react'

const FIELDS = [
  { key: 'tuNombre', label: 'Tu nombre', placeholder: 'Ej: Diego Ramírez', required: true, type: 'text' },
  { key: 'tuProfesion', label: 'Tu profesión', placeholder: 'Ej: Consultor SEO, Community Manager, Diseñador Gráfico', required: true, type: 'text' },
  { key: 'tuExperiencia', label: 'Experiencia de trabajo', placeholder: 'Ej: 3 años ayudando a negocios locales a crecer en redes sociales', required: false, type: 'textarea' },
  { key: 'tuPortafolio', label: 'Portafolio / Sitio web', placeholder: 'Ej: https://midigitalagency.com (opcional)', required: false, type: 'text' },
  { key: 'tuMail', label: 'Correo electrónico', placeholder: 'Ej: diego@midigitalagency.com (opcional)', required: false, type: 'email' },
  { key: 'tuTelefono', label: 'Teléfono / WhatsApp', placeholder: 'Ej: 5512345678 (opcional)', required: false, type: 'tel' },
]

export default function OnboardingModal({ onSave, mode = 'new' }) {
  const [profile, setProfile] = useState({
    tuNombre: '', tuProfesion: '', tuExperiencia: '',
    tuPortafolio: '', tuMail: '', tuTelefono: '',
  })

  const set = (key, value) => setProfile((p) => ({ ...p, [key]: value }))

  const valid = profile.tuNombre.trim() && profile.tuProfesion.trim()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSave(profile)
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-header">
          {mode === 'add' ? (
            <>
              <h2>Agregar cuenta</h2>
              <p className="onboarding-subtitle">
                Ingresa los datos del nuevo perfil profesional.
              </p>
            </>
          ) : (
            <>
              <h2>Bienvenido a MarketFinder</h2>
              <p className="onboarding-subtitle">
                Antes de comenzar, cuéntanos sobre ti para que los mensajes de contacto se personalicen automáticamente.
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {FIELDS.map(({ key, label, placeholder, required, type }) => (
            <div className="form-group" key={key}>
              <label>
                {label}
                {required && <span className="required-mark">*</span>}
              </label>
              {type === 'textarea' ? (
                <textarea
                  className="onboarding-input"
                  value={profile[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                />
              ) : (
                <input
                  type={type}
                  className="onboarding-input"
                  value={profile[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              )}
            </div>
          ))}

          <button type="submit" className="btn-onboarding-start" disabled={!valid}>
            Comenzar
          </button>
        </form>
      </div>
    </div>
  )
}
