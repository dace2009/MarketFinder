import { useState } from 'react'
import UserProfile from './UserProfile'
import SavedLeads from './SavedLeads'
import ApproachChat from './ApproachChat'
import MessageStudio from './MessageStudio'

const SECTIONS = [
  { id: 'profile',   label: 'Detalles del perfil', icon: '📋' },
  { id: 'prospects', label: 'Prospectos',           icon: '⭐' },
  { id: 'approach',  label: 'Acercamiento',         icon: '💬' },
  { id: 'messages',  label: 'Mensajes',             icon: '✏️' },
]

export default function LeadsPage({
  leadsSection, setLeadsSection,
  profile, accounts, savedLeads,
  templates, tags, pendingMessage,
  onProfileChange, onSwitchAccount, onAddAccount, onLogout,
  onDeleteAccount, confirmDelete, onCancelDelete, onConfirmDelete,
  onViewDetail, onToggleContacted, onRemoveLead, onClearLeads,
  onSaveTemplate, onDeleteTemplate, onSaveTag, onDeleteTag,
  onGenerateMessage, onSendToWhatsApp, onUpdateLeadPhone,
  waStatus, waQr, waMessages, waChats, onWASendMessage, onWAGetMessages,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <main className="leads-page">
      <button
        className="leads-hamburger"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Menú"
      >
        ☰
      </button>

      <aside className={`leads-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="leads-sidebar-header">
          <h3>Leads</h3>
        </div>
        <nav className="leads-sidebar-nav">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              className={`sidebar-item ${leadsSection === sec.id ? 'active' : ''}`}
              onClick={() => { setLeadsSection(sec.id); closeSidebar() }}
            >
              <span className="sidebar-icon">{sec.icon}</span>
              <span className="sidebar-label">{sec.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <div className="leads-content">
        {leadsSection === 'profile' && (
          <UserProfile
            profile={profile}
            onChange={onProfileChange}
            accounts={accounts}
            activeId={profile?.id}
            onSwitch={onSwitchAccount}
            onAddAccount={onAddAccount}
            onLogout={onLogout}
            onDeleteAccount={onDeleteAccount}
            confirmDelete={confirmDelete}
            onCancelDelete={onCancelDelete}
            onConfirmDelete={onConfirmDelete}
            waStatus={waStatus}
            waQr={waQr}
          />
        )}

        {leadsSection === 'prospects' && (
          <SavedLeads
            leads={savedLeads}
            onViewDetail={onViewDetail}
            onRemove={onRemoveLead}
            onClear={onClearLeads}
            onToggleContacted={onToggleContacted}
            templates={templates}
            tags={tags}
            profile={profile}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onSaveTag={onSaveTag}
            onDeleteTag={onDeleteTag}
            onGenerateMessage={onGenerateMessage}
            onSendToWhatsApp={onSendToWhatsApp}
          />
        )}

        {leadsSection === 'approach' && (
          <ApproachChat
            leads={savedLeads}
            onUpdateLeadPhone={onUpdateLeadPhone}
            pendingMessage={pendingMessage}
            profile={profile}
            waStatus={waStatus}
            waQr={waQr}
            waMessages={waMessages}
            waChats={waChats}
            onSendMessage={onWASendMessage}
            onGetMessages={onWAGetMessages}
          />
        )}

        {leadsSection === 'messages' && (
          <MessageStudio
            templates={templates}
            tags={tags}
            onSave={onSaveTemplate}
            onDelete={onDeleteTemplate}
            onSaveTag={onSaveTag}
            onDeleteTag={onDeleteTag}
            onGenerateMessage={onGenerateMessage}
            lead={null}
          />
        )}
      </div>
    </main>
  )
}
