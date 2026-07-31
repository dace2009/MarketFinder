export default function SearchPanel({
  businessTypes,
  selectedType,
  onTypeChange,
  onSearch,
  loading,
  center,
  radius,
  onRadiusChange,
  showMapHint,
}) {
  const radiusKm = Math.round(radius / 1000)

  return (
    <div className="search-topbar">
      <div className="search-topbar-inner">
        <div className="form-group">
          <label htmlFor="business-type">Tipo de negocio</label>
          <select
            id="business-type"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="">Selecciona un tipo...</option>
            {businessTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Ubicación</label>
          <div className="coords-display">
            <span>Lat: {center[0].toFixed(4)}</span>
            <span>Lng: {center[1].toFixed(4)}</span>
          </div>
        </div>

        <div className="form-group">
          <label>
            Radio &mdash; <span className="radio-display">{radiusKm} km</span>
          </label>
          <div className="radius-wrap">
            <input
              type="range"
              className="radius-slider"
              min="1000"
              max="50000"
              step="1000"
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
            <div className="slider-labels">
              <span>1</span>
              <span>25</span>
              <span>50 km</span>
            </div>
          </div>
        </div>

        <button
          className="btn-search"
          onClick={onSearch}
          disabled={loading || !selectedType}
        >
          {loading ? 'Analizando...' : 'Buscar'}
        </button>
      </div>
      {showMapHint && <p className="hint">Arrastra el marcador en el mapa para cambiar la ubicación</p>}
    </div>
  )
}
