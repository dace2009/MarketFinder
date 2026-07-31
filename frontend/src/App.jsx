import { useState, useEffect, useCallback, useRef } from 'react'
import MapView from './components/MapView'
import SearchPanel from './components/SearchPanel'
import SmartResultCard from './components/SmartResultCard'
import PlaceDetail from './components/PlaceDetail'
import OnboardingModal from './components/OnboardingModal'
import LeadsPage from './components/LeadsPage'
import MessagePanel from './components/MessagePanel'
import ErrorBoundary from './components/ErrorBoundary'
import { fetchBusinessTypes, smartSearch, fetchPlaceDetail, researchWithAI, fetchProfiles, saveProfile, deleteProfile, fetchLeads, saveLeads, fetchTemplates, saveTemplate, deleteTemplate, fetchTags, saveTag, deleteTag, generateMessage, fetchWhatsAppStatus } from './api'
import useWhatsApp from './hooks/useWhatsApp'

const DEFAULT_PROFILE = {
  tuNombre: '', tuProfesion: '', tuExperiencia: '',
  tuPortafolio: '', tuMail: '', tuTelefono: '',
}

const PHASES = [
  'Buscando negocios en el área…',
  'Obteniendo información detallada…',
  'Investigando presencia digital…',
  'Analizando prospectos con IA…',
]

export default function App() {
  const [center, setCenter] = useState([19.4326, -99.1332])
  const [radius, setRadius] = useState(20000)
  const [businessTypes, setBusinessTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')

  const [smartResults, setSmartResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState(PHASES[0])
  const [error, setError] = useState('')

  const [savedLeads, setSavedLeads] = useState([])
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState('new')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [page, setPage] = useState('search')
  const [resultsCollapsed, setResultsCollapsed] = useState(false)

  const [selectedPlace, setSelectedPlace] = useState(null)
  const [researchResult, setResearchResult] = useState(null)
  const [researchLoading, setResearchLoading] = useState(false)

  const [leadsSection, setLeadsSection] = useState('profile')
  const [templates, setTemplates] = useState([])
  const [tags, setTags] = useState([])
  const [modalMessagePanelOpen, setModalMessagePanelOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState(null)

  const [whatsappWsUrl, setWhatsappWsUrl] = useState('ws://127.0.0.1:11435')
  const [whatsappReady, setWhatsappReady] = useState(false)

  const {
    status: waStatus,
    qr: waQr,
    messagesByChat: waMessages,
    chats: waChats,
    sendMessage: waSendMessage,
    getMessages: waGetMessages,
    refreshChats: waRefreshChats,
  } = useWhatsApp(whatsappWsUrl)

  useEffect(() => {
    fetchWhatsAppStatus()
      .then((data) => {
        if (data.wsUrl) setWhatsappWsUrl(data.wsUrl)
        if (data.status === 'connected') setWhatsappReady(true)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (waStatus === 'ready') setWhatsappReady(true)
  }, [waStatus])

  const handleWASendMessage = useCallback((phone, message) => {
    return waSendMessage(phone, message)
  }, [waSendMessage])

  const phaseRef = useRef(null)

  const loadLeads = useCallback(async (profileId) => {
    try {
      const data = await fetchLeads(profileId)
      setSavedLeads(data || [])
      localStorage.setItem('marketfinder_leads', JSON.stringify(data || []))
    } catch {
      const saved = localStorage.getItem('marketfinder_leads')
      if (saved) setSavedLeads(JSON.parse(saved))
    }
  }, [])

  const syncLeads = useCallback(async (leads) => {
    if (!profile?.id) return
    try {
      await saveLeads(profile.id, leads)
    } catch {}
  }, [profile])

  useEffect(() => {
    fetchBusinessTypes()
      .then((data) => setBusinessTypes(data.types))
      .catch(() => setError('No se pudieron cargar los tipos de negocio'))
  }, [])

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => {})
    fetchTags()
      .then(setTags)
      .catch(() => {})
  }, [])

  const loadAccounts = useCallback(async () => {
    try {
      const list = await fetchProfiles()
      setAccounts(list)
      if (list.length === 0) {
        setShowOnboarding(true)
        setOnboardingMode('new')
        return
      }
      const activeId = localStorage.getItem('marketfinder_active_id')
      const found = list.find((a) => a.id === activeId) || list[0]
      setProfile(found)
      localStorage.setItem('marketfinder_active_id', found.id)
      loadLeads(found.id)
    } catch {
      setShowOnboarding(true)
      setOnboardingMode('new')
    }
  }, [loadLeads])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const handleProfileChange = useCallback(async (updated) => {
    try {
      const saved = await saveProfile(updated)
      setProfile(saved)
      setAccounts((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id)
        if (idx >= 0) {
          const copy = [...prev]; copy[idx] = saved; return copy
        }
        return [...prev, saved]
      })
      localStorage.setItem('marketfinder_active_id', saved.id)
    } catch {
      setError('Error al guardar el perfil')
    }
  }, [])

  const handleOnboardingSave = useCallback(async (updated) => {
    try {
      const saved = await saveProfile(updated)
      setProfile(saved)
      setAccounts((prev) => [...prev, saved])
      localStorage.setItem('marketfinder_active_id', saved.id)
      setShowOnboarding(false)
    } catch {
      setError('Error al guardar el perfil')
    }
  }, [])

  const switchAccount = useCallback((id) => {
    const found = accounts.find((a) => a.id === id)
    if (found) {
      setProfile(found)
      localStorage.setItem('marketfinder_active_id', found.id)
      setSmartResults([])
      loadLeads(found.id)
    }
  }, [accounts, loadLeads])

  const handleLogout = useCallback(() => {
    setProfile(null)
    localStorage.removeItem('marketfinder_active_id')
    setOnboardingMode('new')
    setShowOnboarding(true)
  }, [])

  const handleAddAccount = useCallback(() => {
    setOnboardingMode('add')
    setShowOnboarding(true)
  }, [])

  const handleDeleteAccount = useCallback(async () => {
    if (!profile?.id) return
    try {
      await deleteProfile(profile.id)
      const remaining = accounts.filter((a) => a.id !== profile.id)
      setAccounts(remaining)
      localStorage.removeItem('marketfinder_active_id')
      setConfirmDelete(false)
      if (remaining.length === 0) {
        setProfile(null)
        setSavedLeads([])
        localStorage.removeItem('marketfinder_leads')
        setOnboardingMode('new')
        setShowOnboarding(true)
      } else {
        const next = remaining[0]
        setProfile(next)
        localStorage.setItem('marketfinder_active_id', next.id)
        loadLeads(next.id)
      }
    } catch {
      setError('Error al eliminar el perfil')
    }
  }, [profile, accounts, loadLeads])

  const handleViewSmartResult = useCallback((place) => {
    setSelectedPlace(place)
    setResearchResult({
      facebook: place.facebook || null,
      instagram: place.instagram || null,
      estado_operativo: place.estado_operativo || null,
      servicios_sugeridos: place.servicios_sugeridos || [],
      recomendacion: null,
      hallazgos: [],
      otros_links: place.sitio_web ? [place.sitio_web] : [],
    })
    setResearchLoading(false)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!selectedType) { setError('Selecciona un tipo de negocio'); return }
    if (!profile) { setError('Configura tu perfil primero'); return }
    setLoading(true)
    setError('')
    setSmartResults([])
    setPhase(PHASES[0])

    let idx = 0
    phaseRef.current = setInterval(() => {
      idx = Math.min(idx + 1, PHASES.length - 1)
      setPhase(PHASES[idx])
    }, 12000)

    try {
      const data = await smartSearch(center[0], center[1], radius, selectedType, profile)
      const results = data.results || []
      const overridden = results.map((r) => {
        const saved = savedLeads.find((l) => l.place_id === r.place_id)
        if (saved?.telefono && saved.telefono !== r.telefono) {
          return { ...r, telefono: saved.telefono, _phoneOverridden: true }
        }
        return r
      })
      setSmartResults(overridden)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(phaseRef.current)
      setLoading(false)
    }
  }, [center, radius, selectedType, profile, savedLeads])

  const saveLead = useCallback((place) => {
    setSavedLeads((prev) => {
      if (prev.find((l) => l.place_id === place.place_id)) return prev
      const updated = [place, ...prev]
      localStorage.setItem('marketfinder_leads', JSON.stringify(updated))
      syncLeads(updated)
      return updated
    })
  }, [syncLeads])

  const removeLead = useCallback((placeId) => {
    setSavedLeads((prev) => {
      const updated = prev.filter((l) => l.place_id !== placeId)
      localStorage.setItem('marketfinder_leads', JSON.stringify(updated))
      syncLeads(updated)
      return updated
    })
  }, [syncLeads])

  const isSaved = useCallback((placeId) => savedLeads.some((l) => l.place_id === placeId), [savedLeads])

  const handleViewDetail = useCallback(async (placeId) => {
    const saved = savedLeads.find((l) => l.place_id === placeId)
    if (saved) {
      setSelectedPlace(saved)
      setResearchResult({
        facebook: saved.facebook || null,
        instagram: saved.instagram || null,
        estado_operativo: saved.estado_operativo || null,
        servicios_sugeridos: saved.servicios_sugeridos || [],
        recomendacion: null,
        hallazgos: [],
        otros_links: saved.sitio_web ? [saved.sitio_web] : [],
      })
      setResearchLoading(false)
      return
    }
    try {
      const data = await fetchPlaceDetail(placeId)
      setSelectedPlace(data)
      setResearchResult(null)
      setResearchLoading(true)
      researchWithAI(data)
        .then(setResearchResult)
        .catch(() => {})
        .finally(() => setResearchLoading(false))
    } catch (e) {
      setError(e.message)
    }
  }, [savedLeads])

  const handleToggleContacted = useCallback((placeId, contacted) => {
    setSavedLeads((prev) => {
      const updated = prev.map((l) =>
        l.place_id === placeId ? { ...l, contacted } : l
      )
      localStorage.setItem('marketfinder_leads', JSON.stringify(updated))
      syncLeads(updated)
      return updated
    })
  }, [syncLeads])

  const handleUpdateLeadPhone = useCallback((placeId, telefono) => {
    setSavedLeads((prev) => {
      const updated = prev.map((l) =>
        l.place_id === placeId ? { ...l, telefono } : l
      )
      localStorage.setItem('marketfinder_leads', JSON.stringify(updated))
      syncLeads(updated)
      return updated
    })
  }, [syncLeads])

  const handleSaveTemplate = useCallback(async (tpl) => {
    const saved = await saveTemplate(tpl)
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = saved; return copy
      }
      return [...prev, saved]
    })
    return saved
  }, [])

  const handleDeleteTemplate = useCallback(async (id) => {
    await deleteTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleSaveTag = useCallback(async (tag) => {
    const saved = await saveTag(tag)
    setTags((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = saved; return copy
      }
      return [...prev, saved]
    })
    return saved
  }, [])

  const handleDeleteTag = useCallback(async (id) => {
    await deleteTag(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleGenerateMessage = useCallback(async (data) => {
    return generateMessage(data)
  }, [])

  const handleSendToWhatsApp = useCallback((lead, message) => {
    setPendingMessage({ leadId: lead.place_id, message })
    setSavedLeads((prev) => {
      const updated = prev.map((l) =>
        l.place_id === lead.place_id ? { ...l, mensaje_acercamiento: message, contacted: true } : l
      )
      localStorage.setItem('marketfinder_leads', JSON.stringify(updated))
      syncLeads(updated)
      return updated
    })
    setModalMessagePanelOpen(false)
    setSelectedPlace(null)
    setResearchResult(null)
    setPage('leads')
    setLeadsSection('approach')
  }, [syncLeads])

  const hasResults = smartResults.length > 0

  return (
    <>
      {showOnboarding && <OnboardingModal onSave={handleOnboardingSave} mode={onboardingMode} />}
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>MarketFinder</h1>
          <p className="subtitle">Prospección inteligente de clientes</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-header-icon ${page === 'search' ? 'active' : ''}`}
            onClick={() => setPage('search')}
          >
            🔍 Buscar
          </button>
          <button
            className={`btn-saved ${page === 'leads' ? 'active' : ''}`}
            onClick={() => setPage('leads')}
          >
            👤 Leads ({savedLeads.length})
          </button>
        </div>
      </header>

      <div className="app-body">
        {page === 'search' ? (
          <ErrorBoundary key="search">
          <div className="search-topbar-wrapper">
              <SearchPanel
                businessTypes={businessTypes}
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                onSearch={handleSearch}
                loading={loading}
                center={center}
                radius={radius}
                onRadiusChange={setRadius}
                showMapHint={!hasResults}
              />
              {error && <div className="error-msg">{error}</div>}
            </div>
            <main className="map-area">
              {loading ? (
                <div className="smart-loading">
                  <div className="spinner" />
                  <p className="smart-loading-phase">{phase}</p>
                  <p className="smart-loading-sub">Esto puede tomar 30–60 segundos</p>
                </div>
              ) : hasResults ? (
                <div className={`split-view ${resultsCollapsed ? 'collapsed' : ''}`}>
                  <div className="split-map">
                    <MapView
                      center={center}
                      onCenterChange={setCenter}
                      results={smartResults}
                      onPlaceClick={() => {}}
                      radius={radius}
                    />
                  </div>
                  <div className="split-results">
                    <div className="smart-results-toolbar">
                      <span className="smart-results-count">
                        {smartResults.length} prospecto{smartResults.length !== 1 ? 's' : ''} encontrado{smartResults.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        className="btn-toggle-results"
                        onClick={() => setResultsCollapsed((c) => !c)}
                        title={resultsCollapsed ? 'Mostrar resultados' : 'Ocultar resultados'}
                        data-icon={resultsCollapsed ? '↑ ' : '↓ '}
                      >
                        {resultsCollapsed ? 'Ver resultados' : 'Ocultar'}
                      </button>
                    </div>
                    <div className="smart-cards-grid">
                      {smartResults.map((place) => (
                        <SmartResultCard
                          key={place.place_id}
                          place={place}
                          onSave={saveLead}
                          onRemove={removeLead}
                          isSaved={isSaved(place.place_id)}
                          onClick={() => handleViewSmartResult(place)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <MapView
                  center={center}
                  onCenterChange={setCenter}
                  results={smartResults}
                  onPlaceClick={() => {}}
                  radius={radius}
                />
              )}
            </main>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary key="leads">
          <LeadsPage
            leadsSection={leadsSection}
            setLeadsSection={setLeadsSection}
            profile={profile}
            accounts={accounts}
            savedLeads={savedLeads}
            templates={templates}
            tags={tags}
            pendingMessage={pendingMessage}
            onProfileChange={handleProfileChange}
            onSwitchAccount={switchAccount}
            onAddAccount={handleAddAccount}
            onLogout={handleLogout}
            onDeleteAccount={() => setConfirmDelete(true)}
            confirmDelete={confirmDelete}
            onCancelDelete={() => setConfirmDelete(false)}
            onConfirmDelete={handleDeleteAccount}
            onViewDetail={handleViewDetail}
            onToggleContacted={handleToggleContacted}
            onRemoveLead={removeLead}
            onClearLeads={() => {
              setSavedLeads([])
              localStorage.removeItem('marketfinder_leads')
              syncLeads([])
            }}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onSaveTag={handleSaveTag}
            onDeleteTag={handleDeleteTag}
            onGenerateMessage={handleGenerateMessage}
            onSendToWhatsApp={handleSendToWhatsApp}
            onUpdateLeadPhone={handleUpdateLeadPhone}
            waStatus={waStatus}
            waQr={waQr}
            waMessages={waMessages}
            waChats={waChats}
            onWASendMessage={handleWASendMessage}
            onWAGetMessages={waGetMessages}
          />
          </ErrorBoundary>
        )}
      </div>

      {selectedPlace && (
        <div className="modal-overlay" onClick={() => { setSelectedPlace(null); setResearchResult(null); setModalMessagePanelOpen(false) }}>
          <div className={`modal-twin ${modalMessagePanelOpen ? 'twin-open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <PlaceDetail
              place={selectedPlace}
              onClose={() => { setSelectedPlace(null); setResearchResult(null); setModalMessagePanelOpen(false) }}
              onSave={saveLead}
              onRemove={removeLead}
              isSaved={isSaved(selectedPlace.place_id)}
              researchResult={researchResult}
              researchLoading={researchLoading}
              onToggleContacted={handleToggleContacted}
              onOpenMessagePanel={() => setModalMessagePanelOpen((o) => !o)}
              messagePanelOpen={modalMessagePanelOpen}
            />
            {modalMessagePanelOpen && (
              <div className="message-panel-card modal-message-card">
                <MessagePanel
                  lead={savedLeads.find((l) => l.place_id === selectedPlace.place_id) || selectedPlace}
                  templates={templates}
                  profile={profile}
                  onGenerateMessage={handleGenerateMessage}
                  onClose={() => setModalMessagePanelOpen(false)}
                  onSendToWhatsApp={handleSendToWhatsApp}
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </>
  )
} 
