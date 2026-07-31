const API_BASE = '/api'

async function handleResponse(res, context) {
  if (!res.ok) {
    try {
      const err = await res.json()
      throw new Error(err.detail || `Error ${res.status} en ${context}`)
    } catch (e) {
      if (e.name === 'SyntaxError') {
        throw new Error(`Error ${res.status} en ${context} (respuesta no válida)`)
      }
      throw e
    }
  }
  return res.json()
}

export async function fetchBusinessTypes() {
  const res = await fetch(`${API_BASE}/business-types`)
  return handleResponse(res, 'tipos de negocio')
}

export async function searchPlaces(lat, lng, radius, businessType) {
  try {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        radius,
        business_type: businessType,
        exclude_chains: false,
        only_without_website: false,
      }),
    })
    return handleResponse(res, 'búsqueda')
  } catch (e) {
    console.error('[MarketFinder] Error de conexión:', e)
    throw new Error('Error de conexión con el servidor. Verifica que el servidor esté corriendo.')
  }
}

export async function paginateSearch(token) {
  const res = await fetch(`${API_BASE}/search/paginate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, exclude_chains: false, only_without_website: false }),
  })
  return handleResponse(res, 'paginación')
}

export async function fetchPlaceDetail(placeId) {
  const res = await fetch(`${API_BASE}/place/${placeId}`)
  return handleResponse(res, 'detalle')
}

export async function smartSearch(lat, lng, radius, businessType, profile) {
  try {
    const res = await fetch(`${API_BASE}/smart-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat, lng, radius, business_type: businessType,
        profile: profile || null,
      }),
    })
    return handleResponse(res, 'búsqueda inteligente')
  } catch (e) {
    console.error('[MarketFinder] Error de conexión:', e)
    throw new Error('Error de conexión con el servidor. Verifica que el servidor esté corriendo.')
  }
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/profiles`)
  if (!res.ok) throw new Error('Error al cargar perfiles')
  return res.json()
}

export async function saveProfile(profile) {
  const res = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) throw new Error('Error al guardar perfil')
  return res.json()
}

export async function deleteProfile(id) {
  const res = await fetch(`${API_BASE}/profiles/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar perfil')
  return res.json()
}

export async function fetchLeads(profileId) {
  const res = await fetch(`${API_BASE}/leads/${profileId}`)
  if (!res.ok) throw new Error('Error al cargar leads')
  return res.json()
}

export async function saveLeads(profileId, leads) {
  const res = await fetch(`${API_BASE}/leads/${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leads),
  })
  if (!res.ok) throw new Error('Error al guardar leads')
  return res.json()
}

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/templates`)
  if (!res.ok) throw new Error('Error al cargar plantillas')
  return res.json()
}

export async function saveTemplate(tpl) {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tpl),
  })
  if (!res.ok) throw new Error('Error al guardar plantilla')
  return res.json()
}

export async function deleteTemplate(id) {
  const res = await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar plantilla')
  return res.json()
}

export async function fetchTags() {
  const res = await fetch(`${API_BASE}/tags`)
  if (!res.ok) throw new Error('Error al cargar tags')
  return res.json()
}

export async function saveTag(tag) {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  })
  if (!res.ok) throw new Error('Error al guardar tag')
  return res.json()
}

export async function deleteTag(id) {
  const res = await fetch(`${API_BASE}/tags/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar tag')
  return res.json()
}

export async function generateMessage(data) {
  const res = await fetch(`${API_BASE}/generate-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'generación de mensaje')
}

export async function fetchWhatsAppStatus() {
  const res = await fetch(`${API_BASE}/whatsapp/status`)
  if (!res.ok) throw new Error('Error al obtener estado de WhatsApp')
  return res.json()
}

export async function researchWithAI(placeData) {
  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      place_id: placeData.place_id,
      nombre: placeData.nombre,
      direccion: placeData.direccion_completa || placeData.direccion,
      telefono: placeData.telefono,
      sitio_web: placeData.sitio_web,
      calificacion: placeData.calificacion,
      total_resenas: placeData.total_resenas,
      tipos: placeData.tipos || [],
      resenas: placeData.resenas || [],
    }),
  })
  return handleResponse(res, 'investigación')
}
