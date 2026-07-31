export default function WhatsAppQR({ qr, status }) {
  if (!qr || status !== 'qr') return null

  return (
    <div className="whatsapp-qr-overlay">
      <div className="whatsapp-qr-card">
        <div className="whatsapp-qr-header">
          <h3>Conectar WhatsApp</h3>
          <p className="whatsapp-qr-sub">
            Escanea este código QR con tu WhatsApp para vincular la aplicación
          </p>
        </div>
        <div className="whatsapp-qr-image">
          <img src={qr} alt="Código QR de WhatsApp" />
        </div>
        <div className="whatsapp-qr-steps">
          <ol>
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Toca menú &gt; Dispositivos vinculados</li>
            <li>Toca "Vincular un dispositivo"</li>
            <li>Escanea este código QR</li>
          </ol>
        </div>
        <p className="whatsapp-qr-hint">
          El código se actualiza cada 20 segundos. La sesión se guarda para no tener que escanear de nuevo.
        </p>
      </div>
    </div>
  )
}
