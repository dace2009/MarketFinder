import os
import sys
import re
import json
import uuid
import asyncio
from datetime import datetime
import subprocess
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langdetect import detect, LangDetectException

def find_dotenv():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for p in [
        os.path.join(script_dir, ".env"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
    ]:
        if os.path.exists(p):
            return p
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        for p in [
            os.path.join(exe_dir, ".env"),
            os.path.join(exe_dir, "backend", ".env"),
        ]:
            if os.path.exists(p):
                return p
    return None

env_path = find_dotenv()
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv()

app = FastAPI(title="MarketFinder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
PLACES_BASE = "https://maps.googleapis.com/maps/api/place"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

BUSINESS_TYPES = [
    {"id": "restaurant", "label": "Restaurantes"},
    {"id": "cafe", "label": "Cafeterías"},
    {"id": "bar", "label": "Bares / Cantinas"},
    {"id": "night_club", "label": "Discotecas / Antros"},
    {"id": "bakery", "label": "Panaderías"},
    {"id": "supermarket", "label": "Supermercados"},
    {"id": "convenience_store", "label": "Tiendas de conveniencia"},
    {"id": "clothing_store", "label": "Tiendas de ropa"},
    {"id": "electronics_store", "label": "Tiendas de electrónica"},
    {"id": "furniture_store", "label": "Tiendas de muebles"},
    {"id": "hardware_store", "label": "Ferreterías"},
    {"id": "home_goods_store", "label": "Tiendas del hogar"},
    {"id": "jewelry_store", "label": "Joyerías"},
    {"id": "shoe_store", "label": "Zapaterías"},
    {"id": "beauty_salon", "label": "Salones de belleza"},
    {"id": "hair_care", "label": "Peluquerías"},
    {"id": "spa", "label": "Spas"},
    {"id": "dentist", "label": "Dentistas / Clínicas dentales"},
    {"id": "doctor", "label": "Consultorios médicos"},
    {"id": "hospital", "label": "Hospitales"},
    {"id": "pharmacy", "label": "Farmacias"},
    {"id": "veterinary_care", "label": "Veterinarias"},
    {"id": "pet_store", "label": "Tiendas de mascotas"},
    {"id": "hotel", "label": "Hoteles"},
    {"id": "real_estate_agency", "label": "Inmobiliarias"},
    {"id": "lawyer", "label": "Bufetes de abogados"},
    {"id": "accountant", "label": "Contadores / Despachos"},
    {"id": "insurance_agency", "label": "Agencias de seguros"},
    {"id": "bank", "label": "Bancos"},
    {"id": "car_dealer", "label": "Concesionarias de autos"},
    {"id": "car_repair", "label": "Talleres mecánicos"},
    {"id": "car_wash", "label": "Lavados de autos"},
    {"id": "gas_station", "label": "Gasolineras"},
    {"id": "laundry", "label": "Lavanderías"},
    {"id": "dry_cleaner", "label": "Tintorerías"},
    {"id": "travel_agency", "label": "Agencias de viajes"},
    {"id": "school", "label": "Escuelas"},
    {"id": "university", "label": "Universidades"},
    {"id": "library", "label": "Bibliotecas"},
    {"id": "museum", "label": "Museos"},
    {"id": "movie_theater", "label": "Cines"},
    {"id": "park", "label": "Parques"},
    {"id": "church", "label": "Iglesias"},
    {"id": "funeral_home", "label": "Funerarias"},
    {"id": "gym", "label": "Gimnasios / Crossfit"},
    {"id": "bowling_alley", "label": "Boleras"},
    {"id": "amusement_park", "label": "Parques de diversiones"},
    {"id": "art_gallery", "label": "Galerías de arte"},
    {"id": "theater", "label": "Teatros"},
    {"id": "storage", "label": "Bodegas / Almacenes"},
]

CHAIN_KEYWORDS = [
    "starbucks", "mc'donald's", "mcdonalds", "burger king", "domino's", "dominos",
    "pizza hut", "kfc", "subway", "carl's jr", "little caesars", "dunkin",
    "walmart", "costco", "sam's club", "sams club", "soriana", "chedraui",
    "oxxo", "7-eleven", "se ven", "circle k", "farmacias similares",
    "farmacia guadalajara", "farmacias del ahorro", "farmacia benavides",
    "sanborns", "sears", "liverpool", "palacio de hierro", "coppel", "elektra",
    "office depot", "office max", "home depot", "stereo sho",
    "vips", "toks", "el portón", "la casa de toño", "italianni's",
    "chilis", "applebees", "outback", "red lobster", "olive garden",
    "cinépolis", "cinepolis", "cinemex",
    "telcel", "movistar", "at&t", "att",
    "bbva", "banamex", "citibanamex", "santander", "banorte", "hsbc",
    "scotiabank", "inbursa", "azteca",
    "petróleos mexicanos", "pemex", "shell", "bp", "chevron", "mobil",
    "waldo's", "waltmart", "aurrerá", "bodega aurrera",
    "mi bodega aurrera", "superama", "city club", "artic",
    "pepsi", "coca-cola", "coca cola",
    "neto", "helly", "garis", "abarrotes",
]

CHAIN_TYPES = [
    "department_store", "shopping_mall", "supermarket", "gas_station",
    "convenience_store", "bank", "movie_theater",
]

LANGUAGE_MAP = {
    "es": "Español", "en": "Inglés", "fr": "Francés", "de": "Alemán",
    "it": "Italiano", "pt": "Portugués", "ja": "Japonés", "ko": "Coreano",
    "zh-cn": "Chino simplificado", "zh-tw": "Chino tradicional",
    "ar": "Árabe", "ru": "Ruso", "nl": "Holandés", "pl": "Polaco",
}

CLOSED_STATUSES = {"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"}


def _classify_website(url: str | None) -> dict:
    """Detect if a 'website' URL is actually a social media link."""
    if not url:
        return {"sitio_web": None, "facebook_url": None, "instagram_url": None}
    u = url.lower()
    if "facebook.com" in u:
        return {"sitio_web": None, "facebook_url": url, "instagram_url": None}
    if "instagram.com" in u:
        return {"sitio_web": None, "facebook_url": None, "instagram_url": url}
    return {"sitio_web": url, "facebook_url": None, "instagram_url": None}


class SearchRequest(BaseModel):
    lat: float
    lng: float
    radius: int = 20000
    business_type: str
    language: str = "es"
    exclude_chains: bool = True
    only_without_website: bool = True
    min_score: int = 0


class SearchResponse(BaseModel):
    results: list
    total: int
    next_page_token: str | None = None


def detect_language(text: str) -> str:
    if not text:
        return "Desconocido"
    try:
        code = detect(text)
        return LANGUAGE_MAP.get(code, code.upper())
    except LangDetectException:
        return "Desconocido"


def is_chain(place: dict, detail: dict = None) -> dict:
    nombre = (place.get("name") or "").lower()
    website = (detail or place).get("website") or ""
    website_lower = website.lower()
    tipos = (detail or place).get("types", [])

    reason = None
    confidence = "bajo"

    for ct in CHAIN_TYPES:
        if ct in tipos:
            if ct in ("shopping_mall", "department_store", "supermarket"):
                reason = f"Tipo de negocio: {ct}"
                confidence = "alto"
                return {"es_cadena": True, "razon": reason, "confianza": confidence}

    for keyword in CHAIN_KEYWORDS:
        if keyword in nombre:
            reason = f"Nombre coincide con cadena conocida"
            confidence = "alto"
            return {"es_cadena": True, "razon": reason, "confianza": confidence}

    if website and nombre:
        domain = re.sub(r'https?://(www\.)?', '', website_lower).split('/')[0].split('.')
        name_words = set(nombre.split())
        if domain and len(domain) >= 2:
            brand_in_domain = domain[0] if len(domain) >= 2 else ""
            if brand_in_domain and brand_in_domain not in name_words and len(brand_in_domain) > 3:
                pass

    if website:
        domain_parts = website_lower.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0].split('.')
        if len(domain_parts) >= 2:
            tld = domain_parts[-1]
            domain_name = domain_parts[-2] if len(domain_parts) >= 2 else ""
            if tld in ('com', 'mx', 'com.mx') and domain_name and len(domain_name) < 4:
                reason = f"Dominio muy corto ({domain_name}.{tld}), posible cadena"
                confidence = "bajo"
                return {"es_cadena": True, "razon": reason, "confianza": confidence}

    return {"es_cadena": False, "razon": None, "confianza": None}


def calculate_opportunity_score(place: dict, chain_info: dict, detail: dict = None) -> dict:
    score = 0
    factors = []

    raw_website = (detail or place).get("website") or ""
    website = _classify_website(raw_website)["sitio_web"]  # only real websites
    rating = (detail or place).get("rating") or 0
    reviews = (detail or place).get("user_ratings_total") or 0

    if not website:
        score += 40
        factors.append({"factor": "Sin sitio web", "puntos": 40, "icono": "🌐"})
    else:
        factors.append({"factor": "Tiene sitio web", "puntos": 0, "icono": "🌐"})

    if chain_info.get("es_cadena"):
        if chain_info.get("confianza") == "alto":
            score -= 50
            factors.append({"factor": f"Cadena ({chain_info['razon']})", "puntos": -50, "icono": "🏢"})
        else:
            score -= 20
            factors.append({"factor": f"Posible cadena ({chain_info['razon']})", "puntos": -20, "icono": "🏢"})
    else:
        score += 20
        factors.append({"factor": "Negocio independiente", "puntos": 20, "icono": "🏪"})

    if rating > 0:
        if 3.0 <= rating <= 4.2:
            score += 20
            factors.append({"factor": f"Calificación {rating}/5 - necesita mejorar", "puntos": 20, "icono": "⭐"})
        elif rating < 3.0:
            score += 10
            factors.append({"factor": f"Calificación baja {rating}/5 - oportunidad", "puntos": 10, "icono": "⭐"})
        else:
            score += 5
            factors.append({"factor": f"Calificación alta {rating}/5 - bien valorado", "puntos": 5, "icono": "⭐"})

    if 20 <= reviews <= 300:
        score += 20
        factors.append({"factor": f"{reviews} reseñas - clientela activa", "puntos": 20, "icono": "💬"})
    elif reviews > 300:
        score += 10
        factors.append({"factor": f"{reviews} reseñas - muy establecido", "puntos": 10, "icono": "💬"})
    elif reviews > 0:
        score += 15
        factors.append({"factor": f"{reviews} reseñas - pocas reseñas", "puntos": 15, "icono": "💬"})
    else:
        score += 5
        factors.append({"factor": "Sin reseñas - negocio nuevo?", "puntos": 5, "icono": "💬"})

    final_score = max(0, min(100, score))

    if final_score >= 70:
        nivel = "Muy alto"
    elif final_score >= 50:
        nivel = "Alto"
    elif final_score >= 30:
        nivel = "Medio"
    else:
        nivel = "Bajo"

    return {
        "puntaje": final_score,
        "nivel": nivel,
        "factores": factors,
    }


def generate_outreach_message(place: dict) -> dict:
    nombre = place.get("nombre", "")
    tipo = ", ".join(place.get("tipos", []))[:50] if place.get("tipos") else "negocio"
    sitio = place.get("sitio_web")

    if not sitio:
        whatsapp = (
            f"¡Hola! 🚀 Vi tu negocio {nombre} en Google Maps y noté que "
            f"aún no tienes sitio web. Me dedico a crear páginas web profesionales "
            f"para negocios como el tuyo. ¿Te gustaría saber cómo podemos ayudarte "
            f"a tener presencia en internet y atraer más clientes?"
        )
        call = (
            f"Hola, te hablo de MarketFinder. Vi tu {tipo} ({nombre}) en Google Maps "
            f"y noté que no tiene sitio web. Ofrezco servicios de marketing digital "
            f"y creación de páginas web. ¿Te interesaría conocer más?"
        )
    else:
        whatsapp = (
            f"¡Hola! 🚀 Vi tu negocio {nombre} en Google Maps y vi que tienes "
            f"sitio web. Me encantaría ayudarte a mejorarlo con estrategias de "
            f"marketing digital para atraer más clientes. ¿Te interesaría saber más?"
        )
        call = (
            f"Hola, te hablo de MarketFinder. Vi tu {tipo} ({nombre}) en Google Maps "
            f"y me gustaría saber si te interesaría mejorar tu presencia digital "
            f"con servicios de marketing."
        )

    return {
        "whatsapp": whatsapp,
        "llamada": call,
    }


def search_social_media(nombre: str, ciudad: str | None) -> dict:
    from duckduckgo_search import DDGS
    location = f"{nombre} {ciudad or 'México'}"
    result = {"facebook": None, "instagram": None, "otros": [], "snippets": []}
    searches = [
        (f"{location} site:facebook.com", "facebook"),
        (f"{location} site:instagram.com", "instagram"),
        (f"{location} redes sociales contacto", "general"),
    ]
    try:
        with DDGS() as ddgs:
            for query, kind in searches:
                try:
                    hits = list(ddgs.text(query, max_results=3, region="mx-es"))
                    for h in hits:
                        url = h.get("href", "")
                        snippet = h.get("body", "")
                        if snippet:
                            result["snippets"].append(snippet[:200])
                        if kind == "facebook" and "facebook.com" in url and not result["facebook"]:
                            result["facebook"] = url
                        elif kind == "instagram" and "instagram.com" in url and not result["instagram"]:
                            result["instagram"] = url
                        elif kind == "general":
                            if "facebook.com" in url and not result["facebook"]:
                                result["facebook"] = url
                            elif "instagram.com" in url and not result["instagram"]:
                                result["instagram"] = url
                            elif url and url not in (result["facebook"], result["instagram"]):
                                result["otros"].append(url)
                except Exception:
                    pass
    except Exception:
        pass
    return result


def scrape_website_for_social_links(url: str) -> dict:
    found = {"facebook": None, "instagram": None}
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        html = resp.text
        fb = re.search(r'https?://(?:www\.)?facebook\.com/[^\s"\'<>]+', html)
        ig = re.search(r'https?://(?:www\.)?instagram\.com/[^\s"\'<>]+', html)
        if fb:
            found["facebook"] = fb.group(0).rstrip("/")
        if ig:
            found["instagram"] = ig.group(0).rstrip("/")
    except Exception:
        pass
    return found


def build_ollama_messages(nombre: str, direccion: str | None, telefono: str | None,
                           sitio_web: str | None, calificacion: float | None,
                           total_resenas: int | None, tipos: list, resenas: list,
                           web_data: dict) -> list[dict]:
    system = (
        "Eres un asistente de investigación de negocios para el mercado mexicano. "
        "Analiza la información disponible sobre el negocio y devuelve ÚNICAMENTE un objeto JSON válido. "
        "No incluyas texto adicional, explicaciones ni bloques de código. Solo el JSON puro.\n"
        "El JSON debe tener exactamente estas claves:\n"
        '{"facebook": "url_o_null", "instagram": "url_o_null", '
        '"otros_links": ["url1"], '
        '"estado_operativo": "activo|posiblemente_cerrado|cerrado|desconocido", '
        '"hallazgos": ["hallazgo1", "hallazgo2"], '
        '"recomendacion": "texto en español", '
        '"nivel_confianza": "alto|medio|bajo"}'
    )

    snippets_text = "\n".join(f"- {s}" for s in web_data.get("snippets", [])[:5])
    resenas_text = "\n".join(
        f"- ({r.get('calificacion', '?')}★, {r.get('tiempo', '')}): {str(r.get('texto', ''))[:150]}"
        for r in resenas[:3]
    )

    user = (
        f"Investiga este negocio:\n"
        f"Nombre: {nombre}\n"
        f"Dirección: {direccion or 'No disponible'}\n"
        f"Teléfono: {telefono or 'No disponible'}\n"
        f"Sitio web: {sitio_web or 'Sin sitio web'}\n"
        f"Calificación: {calificacion or 'N/D'}/5 ({total_resenas or 0} reseñas)\n"
        f"Categorías: {', '.join(tipos) if tipos else 'N/D'}\n\n"
        f"Redes sociales encontradas por búsqueda web:\n"
        f"- Facebook: {web_data.get('facebook') or 'No encontrado'}\n"
        f"- Instagram: {web_data.get('instagram') or 'No encontrado'}\n"
        f"- Otros: {', '.join(web_data.get('otros', [])) or 'Ninguno'}\n\n"
        f"Fragmentos de búsqueda web:\n{snippets_text or 'Sin resultados'}\n\n"
        f"Reseñas recientes:\n{resenas_text or 'Sin reseñas disponibles'}"
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def parse_place(place: dict, detail: dict = None) -> dict:
    d = detail or place

    p = {
        "place_id": place.get("place_id"),
        "nombre": place.get("name"),
        "direccion": place.get("vicinity") or place.get("formatted_address", ""),
        "coordenadas": place.get("geometry", {}).get("location", {}),
        "calificacion": place.get("rating"),
        "total_resenas": place.get("user_ratings_total", 0),
        "tipos": place.get("types", []),
        "precio": place.get("price_level", 0),
        "business_status": place.get("business_status") or (d.get("business_status") if d else None),
    }

    if detail:
        web_info = _classify_website(detail.get("website"))
        p.update({
            "telefono": detail.get("formatted_phone_number"),
            "telefono_internacional": detail.get("international_phone_number"),
            "sitio_web": web_info["sitio_web"],
            "direccion_completa": detail.get("formatted_address"),
            "horarios": detail.get("opening_hours", {}).get("weekday_text", []) if detail.get("opening_hours") else [],
            "abierto_ahora": detail.get("opening_hours", {}).get("open_now") if detail.get("opening_hours") else None,
            "url_maps": detail.get("url"),
            "plus_code": detail.get("plus_code", {}).get("global_code"),
            "resenas": [
                {
                    "autor": r.get("author_name"),
                    "calificacion": r.get("rating"),
                    "texto": r.get("text"),
                    "tiempo": r.get("relative_time_description"),
                }
                for r in detail.get("reviews", [])[:5]
            ],
        })
        # Pre-populate social links detected from the website field
        if web_info["facebook_url"]:
            p["_presocial_fb"] = web_info["facebook_url"]
        if web_info["instagram_url"]:
            p["_presocial_ig"] = web_info["instagram_url"]

        nombre = p.get("nombre", "")
        sitio = p.get("sitio_web", "")
        lang_text = sitio or nombre
        p["idioma"] = detect_language(lang_text)
        p["clientes_estimados"] = estimate_customers(detail)
    else:
        lang_text = p.get("nombre", "")
        p["idioma"] = detect_language(lang_text)
        p["clientes_estimados"] = estimate_customers(place)

    chain_info = is_chain(place, d)
    p["cadena"] = chain_info

    opportunity = calculate_opportunity_score(place, chain_info, d)
    p["oportunidad"] = opportunity

    mensajes = generate_outreach_message(p)
    p["mensajes"] = mensajes

    p["tiene_sitio_web"] = bool(p.get("sitio_web"))

    return p


def estimate_customers(place: dict) -> dict:
    reviews = place.get("user_ratings_total", 0)
    rating = place.get("rating", 0)
    price_level = place.get("price_level", 0)

    base = reviews * max(rating, 1) * 5
    if price_level > 0:
        base *= 1 + (price_level * 0.1)

    if base > 50000:
        level = "Muy alto"
    elif base > 10000:
        level = "Alto"
    elif base > 2000:
        level = "Medio"
    elif base > 200:
        level = "Bajo"
    else:
        level = "Muy bajo"

    return {
        "estimado_mensual": round(base),
        "nivel": level,
        "total_resenas": reviews,
        "calificacion": rating,
    }


def filter_results(results: list, req: SearchRequest) -> list:
    filtered = results

    if req.only_without_website:
        filtered = [r for r in filtered if not r.get("tiene_sitio_web")]

    if req.exclude_chains:
        filtered = [
            r for r in filtered
            if not (r.get("cadena", {}).get("es_cadena") and r["cadena"].get("confianza") == "alto")
        ]

    if req.min_score > 0:
        filtered = [r for r in filtered if (r.get("oportunidad") or {}).get("puntaje", 0) >= req.min_score]

    return filtered


@app.get("/api/business-types")
def get_business_types():
    return {"types": BUSINESS_TYPES}


@app.post("/api/search")
async def search_places(req: SearchRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key no configurada. Revisa el archivo .env")

    params = {
        "location": f"{req.lat},{req.lng}",
        "radius": req.radius,
        "type": req.business_type,
        "language": req.language,
        "key": API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
        data = resp.json()

    if data.get("status") != "OK" and data.get("status") != "ZERO_RESULTS":
        error_msg = data.get("error_message", "Error desconocido de Google Places API")
        raise HTTPException(status_code=502, detail=f"Error de Google Places: {error_msg}")

    results = [parse_place(p) for p in data.get("results", [])]
    results = filter_results(results, req)
    results.sort(key=lambda r: (r.get("oportunidad") or {}).get("puntaje", 0), reverse=True)
    next_token = data.get("next_page_token")

    return SearchResponse(
        results=results,
        total=len(results),
        next_page_token=next_token,
    )


class ResearchRequest(BaseModel):
    place_id: str
    nombre: str
    direccion: str | None = None
    telefono: str | None = None
    sitio_web: str | None = None
    calificacion: float | None = None
    total_resenas: int | None = None
    tipos: list[str] = []
    resenas: list[dict] = []
    model: str | None = None


class PaginateRequest(BaseModel):
    token: str
    exclude_chains: bool = True
    only_without_website: bool = True
    min_score: int = 0

@app.post("/api/search/paginate")
async def search_places_paginate(req: PaginateRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key no configurada. Revisa el archivo .env")

    params = {
        "pagetoken": req.token,
        "key": API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
        data = resp.json()

    if data.get("status") != "OK":
        error_msg = data.get("error_message", "Error desconocido")
        raise HTTPException(status_code=502, detail=f"Error de Google Places: {error_msg}")

    results = [parse_place(p) for p in data.get("results", [])]
    filtered = results

    if req.only_without_website:
        filtered = [r for r in filtered if not r.get("tiene_sitio_web")]

    if req.exclude_chains:
        filtered = [
            r for r in filtered
            if not (r.get("cadena", {}).get("es_cadena") and r["cadena"].get("confianza") == "alto")
        ]

    if req.min_score > 0:
        filtered = [r for r in filtered if (r.get("oportunidad") or {}).get("puntaje", 0) >= req.min_score]

    filtered.sort(key=lambda r: (r.get("oportunidad") or {}).get("puntaje", 0), reverse=True)

    return SearchResponse(
        results=filtered,
        total=len(filtered),
        next_page_token=data.get("next_page_token"),
    )


@app.get("/api/place/{place_id}")
async def get_place_detail(place_id: str):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key no configurada. Revisa el archivo .env")

    fields = [
        "place_id", "name", "formatted_address", "formatted_phone_number",
        "international_phone_number", "website", "rating",
        "user_ratings_total", "opening_hours", "types",
        "price_level", "photos", "reviews", "url",
        "geometry", "vicinity", "plus_code",
    ]

    params = {
        "place_id": place_id,
        "fields": ",".join(fields),
        "language": "es",
        "key": API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{PLACES_BASE}/details/json", params=params)
        data = resp.json()

    if data.get("status") != "OK":
        error_msg = data.get("error_message", "Error desconocido")
        raise HTTPException(status_code=502, detail=f"Error de Google Places: {error_msg}")

    return parse_place(data.get("result", {}), detail=data.get("result", {}))


@app.get("/api/ollama/status")
async def ollama_status():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
        if resp.status_code != 200:
            return {"available": False, "models": [], "error": "Ollama respondió con error"}
        models = [m["name"] for m in resp.json().get("models", [])]
        return {"available": True, "models": models, "default_model": OLLAMA_MODEL}
    except httpx.ConnectError:
        return {"available": False, "models": [], "error": "Ollama no está corriendo en localhost:11434"}
    except Exception as e:
        return {"available": False, "models": [], "error": str(e)}


@app.post("/api/research")
async def research_place(req: ResearchRequest):
    model = req.model or OLLAMA_MODEL

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            ping = await client.get(f"{OLLAMA_HOST}/api/tags")
        if ping.status_code != 200:
            raise HTTPException(status_code=503, detail="Ollama no responde correctamente")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama no está corriendo. Instala Ollama y ejecuta: ollama pull {model}"
        )

    ciudad = None
    if req.direccion:
        parts = req.direccion.split(",")
        ciudad = parts[-1].strip() if len(parts) > 1 else req.direccion

    loop = asyncio.get_event_loop()
    web_data = await loop.run_in_executor(None, search_social_media, req.nombre, ciudad)

    if req.sitio_web:
        site_data = await loop.run_in_executor(None, scrape_website_for_social_links, req.sitio_web)
        if site_data["facebook"] and not web_data["facebook"]:
            web_data["facebook"] = site_data["facebook"]
        if site_data["instagram"] and not web_data["instagram"]:
            web_data["instagram"] = site_data["instagram"]

    messages = build_ollama_messages(
        nombre=req.nombre,
        direccion=req.direccion,
        telefono=req.telefono,
        sitio_web=req.sitio_web,
        calificacion=req.calificacion,
        total_resenas=req.total_resenas,
        tipos=req.tipos,
        resenas=req.resenas,
        web_data=web_data,
    )

    payload = {
        "model": model,
        "messages": messages,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 512},
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=payload)
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="Ollama tardó demasiado. Intenta con un modelo más pequeño.")

    if resp.status_code == 404:
        raise HTTPException(
            status_code=422,
            detail=f"Modelo '{model}' no encontrado. Ejecuta: ollama pull {model}"
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Ollama devolvió error {resp.status_code}")

    try:
        content = resp.json()["message"]["content"]
        result_json = json.loads(content)
    except (KeyError, json.JSONDecodeError):
        match = re.search(r'\{.*\}', content if 'content' in dir() else '', re.DOTALL)
        if match:
            try:
                result_json = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise HTTPException(status_code=502, detail="Ollama devolvió una respuesta no parseable")
        else:
            raise HTTPException(status_code=502, detail="Ollama devolvió una respuesta no parseable")

    # Normalizar: Ollama a veces devuelve el string "null" en lugar de JSON null
    for key in ("facebook", "instagram"):
        if result_json.get(key) in (None, "null", "None", ""):
            result_json[key] = None

    if not result_json.get("facebook") and web_data.get("facebook"):
        result_json["facebook"] = web_data["facebook"]
    if not result_json.get("instagram") and web_data.get("instagram"):
        result_json["instagram"] = web_data["instagram"]
    if not isinstance(result_json.get("otros_links"), list):
        result_json["otros_links"] = []
    if not isinstance(result_json.get("hallazgos"), list):
        result_json["hallazgos"] = []

    return result_json


class SmartSearchRequest(BaseModel):
    lat: float
    lng: float
    radius: int = 20000
    business_type: str
    language: str = "es"
    model: str | None = None
    profile: dict | None = None


async def _fetch_detail(client: httpx.AsyncClient, place_id: str) -> dict:
    fields = [
        "place_id", "name", "formatted_address", "formatted_phone_number",
        "international_phone_number", "website", "rating", "user_ratings_total",
        "opening_hours", "business_status", "types", "price_level", "reviews", "url",
        "geometry", "vicinity", "plus_code",
    ]
    try:
        resp = await client.get(
            f"{PLACES_BASE}/details/json",
            params={"place_id": place_id, "fields": ",".join(fields), "language": "es", "key": API_KEY},
        )
        data = resp.json()
        return data.get("result", {}) if data.get("status") == "OK" else {}
    except Exception:
        return {}


def _social_quick(nombre: str, ciudad: str | None) -> dict:
    result = {"facebook": None, "instagram": None}
    try:
        from duckduckgo_search import DDGS
        loc = f"{nombre} {ciudad or 'México'}"
        with DDGS() as ddgs:
            for query, key in [
                (f"{loc} site:facebook.com", "facebook"),
                (f"{loc} site:instagram.com", "instagram"),
            ]:
                try:
                    hits = list(ddgs.text(query, max_results=2, region="mx-es"))
                    for h in hits:
                        if key in h.get("href", ""):
                            result[key] = h["href"]
                            break
                except Exception:
                    pass
    except Exception:
        pass
    return result


def _build_batch_messages(summaries: list, profile: dict | None = None) -> list[dict]:
    n = len(summaries)
    user_info = ""
    if profile:
        p = profile
        parts = []
        if p.get("tuNombre"):
            parts.append(f"Nombre: {p['tuNombre']}")
        if p.get("tuProfesion"):
            parts.append(f"Profesión: {p['tuProfesion']}")
        if p.get("tuExperiencia"):
            parts.append(f"Experiencia: {p['tuExperiencia']}")
        if p.get("tuPortafolio"):
            parts.append(f"Portafolio: {p['tuPortafolio']}")
        if p.get("tuMail"):
            parts.append(f"Email: {p['tuMail']}")
        if p.get("tuTelefono"):
            parts.append(f"Teléfono: {p['tuTelefono']}")
        if parts:
            user_info = "\nDatos del usuario consultor:\n" + "\n".join(parts) + "\n\n"

    system = (
        "Eres un consultor de marketing digital para el mercado mexicano. "
        f"Recibirás {n} negocios. Analiza CADA UNO y devuelve el resultado.\n\n"
        f"{user_info}"
        'Devuelve ÚNICAMENTE este JSON (con exactamente el mismo número de items que negocios recibidos):\n'
        '{"prospectos":[{"place_id":"...","es_prospecto":true,"descarte_razon":null,'
        '"estado_operativo":"activo","servicios":["..."],"mensaje":"..."}]}\n\n'
        "DESCARTAR (es_prospecto:false) si: cadena/franquicia · banco/gasolinera/hospital/iglesia · "
        "tiene sitio web + redes + más de 500 reseñas · "
        "business_status es CLOSED_TEMPORARILY o CLOSED_PERMANENTLY.\n\n"
        "estado_operativo: usa 'cerrado' si business_status es CLOSED_PERMANENTLY, "
        "'posiblemente_cerrado' si CLOSED_TEMPORARILY, 'activo' si OPERATIONAL.\n\n"
        "Servicios (elige 2-4 según el negocio): Diseño de sitio web · Gestión de redes sociales · "
        "Fotografía profesional · Diseño de logotipo · Publicidad digital · Fotografía de productos · "
        "Tarjetas de presentación · Email marketing · Branding · Diseño de menú\n\n"
        "estado_operativo: activo|posiblemente_cerrado|cerrado|desconocido\n\n"
        "El mensaje: en español, 2-3 oraciones, directo para WhatsApp, impersonal pero cercano. "
        "NO uses nombres de clientes (no los conoces). Menciona algo del negocio. "
        "Considera los datos del consultor (profesión, experiencia) para personalizar el mensaje."
    )
    user = "Negocios:\n" + json.dumps(summaries, ensure_ascii=False)
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _city_from_address(place: dict) -> str | None:
    addr = place.get("direccion_completa") or place.get("direccion") or ""
    parts = [x.strip() for x in addr.split(",")]
    return parts[-2] if len(parts) >= 3 else (parts[-1] if parts else None)


@app.post("/api/smart-search")
async def smart_search(req: SmartSearchRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key no configurada")

    # ── 1. Places nearby search ───────────────────────────────────────────
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{PLACES_BASE}/nearbysearch/json", params={
            "location": f"{req.lat},{req.lng}",
            "radius": req.radius,
            "type": req.business_type,
            "language": req.language,
            "key": API_KEY,
        })
    data = resp.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(status_code=502, detail=f"Error de Google Places: {data.get('error_message','desconocido')}")

    raw_places = data.get("results", [])[:20]
    if not raw_places:
        return {"results": [], "total": 0}

    # ── 2. Pre-filter: skip closed businesses and obvious chains ─────────
    candidates = []
    for p in raw_places:
        if p.get("business_status") in CLOSED_STATUSES:
            continue
        c = is_chain(p)
        if not (c.get("es_cadena") and c.get("confianza") == "alto"):
            candidates.append(p)
    candidates = candidates[:15]

    # ── 3. Place details for all candidates in parallel ───────────────────
    async with httpx.AsyncClient(timeout=20.0) as client:
        details = await asyncio.gather(*[_fetch_detail(client, p["place_id"]) for p in candidates])

    parsed = [parse_place(p, d if d else None) for p, d in zip(candidates, details)]

    # Re-filter using the more reliable business_status from Place Details
    parsed = [p for p in parsed if p.get("business_status") not in CLOSED_STATUSES]

    # ── 4. Social media search (semaphore = 3 concurrent) ─────────────────
    loop = asyncio.get_event_loop()
    sem = asyncio.Semaphore(3)

    async def _social_sem(nombre, ciudad):
        async with sem:
            return await loop.run_in_executor(None, _social_quick, nombre, ciudad)

    social_list = await asyncio.gather(
        *[_social_sem(p["nombre"], _city_from_address(p)) for p in parsed],
        return_exceptions=True,
    )
    for place, soc in zip(parsed, social_list):
        soc = soc if isinstance(soc, dict) else {}
        fb_from_web = place.pop("_presocial_fb", None)
        ig_from_web = place.pop("_presocial_ig", None)
        place["facebook"] = soc.get("facebook") or fb_from_web
        place["instagram"] = soc.get("instagram") or ig_from_web

    # Scrape real websites for social links (quick timeout, limited concurrency)
    def _scrape_quick(url: str) -> dict:
        found = {"facebook": None, "instagram": None}
        try:
            with httpx.Client(timeout=4.0, follow_redirects=True) as client:
                resp = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            html = resp.text
            fb = re.search(r'https?://(?:www\.)?facebook\.com/[^\s"\'<>]+', html)
            ig = re.search(r'https?://(?:www\.)?instagram\.com/[^\s"\'<>]+', html)
            if fb:
                found["facebook"] = fb.group(0).rstrip("/")
            if ig:
                found["instagram"] = ig.group(0).rstrip("/")
        except Exception:
            pass
        return found

    scrape_sem = asyncio.Semaphore(4)

    async def _scrape_sem(url):
        async with scrape_sem:
            return await loop.run_in_executor(None, _scrape_quick, url)

    scrape_targets = [(i, p) for i, p in enumerate(parsed) if p.get("sitio_web") and (not p.get("facebook") or not p.get("instagram"))]
    if scrape_targets:
        scraped_list = await asyncio.gather(
            *[_scrape_sem(p["sitio_web"]) for _, p in scrape_targets],
            return_exceptions=True,
        )
        for (i, place), scraped in zip(scrape_targets, scraped_list):
            if isinstance(scraped, dict):
                if scraped.get("facebook") and not place.get("facebook"):
                    place["facebook"] = scraped["facebook"]
                if scraped.get("instagram") and not place.get("instagram"):
                    place["instagram"] = scraped["instagram"]

    # ── 5. Ollama batch analysis ──────────────────────────────────────────
    model = req.model or OLLAMA_MODEL
    ai_map: dict = {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            ping = await client.get(f"{OLLAMA_HOST}/api/tags")
        if ping.status_code == 200:
            top = sorted(parsed, key=lambda r: (r.get("oportunidad") or {}).get("puntaje", 0), reverse=True)[:10]
            summaries = [
                {
                    "place_id": p["place_id"],
                    "nombre": p["nombre"],
                    "tipos": p.get("tipos", [])[:2],
                    "business_status": p.get("business_status", "OPERATIONAL"),
                    "tiene_sitio_web": p.get("tiene_sitio_web", False),
                    "facebook": bool(p.get("facebook")),
                    "instagram": bool(p.get("instagram")),
                    "calificacion": p.get("calificacion"),
                    "total_resenas": p.get("total_resenas", 0),
                    "es_cadena": p.get("cadena", {}).get("es_cadena", False),
                    "resena": (p.get("resenas") or [{}])[0].get("texto", "")[:60]
                        if p.get("resenas") else "",
                }
                for p in top
            ]
            ai_payload = {
                "model": model,
                "messages": _build_batch_messages(summaries, req.profile),
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 2048},
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                ai_resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=ai_payload)
            if ai_resp.status_code == 200:
                content = ai_resp.json()["message"]["content"]
                items = []
                try:
                    raw = json.loads(content)
                    if isinstance(raw, list):
                        items = raw
                    elif isinstance(raw, dict):
                        # {"prospectos": [...]} wrapper or single object
                        for v in raw.values():
                            if isinstance(v, list):
                                items = v
                                break
                        if not items and "place_id" in raw:
                            items = [raw]
                except json.JSONDecodeError:
                    # Extract all JSON objects from text
                    for m in re.finditer(r'\{[^{}]+\}', content):
                        try:
                            obj = json.loads(m.group(0))
                            if "place_id" in obj:
                                items.append(obj)
                        except Exception:
                            pass
                for item in items:
                    if isinstance(item, dict) and "place_id" in item:
                        ai_map[item["place_id"]] = item
    except Exception:
        pass

    # ── 6. Build final results ────────────────────────────────────────────
    results = []
    for place in parsed:
        pid = place.get("place_id")
        ai = ai_map.get(pid, {})
        if ai and not ai.get("es_prospecto", True):
            continue
        estado = ai.get("estado_operativo") or (
            "cerrado" if place.get("business_status") == "CLOSED_PERMANENTLY"
            else "posiblemente_cerrado" if place.get("business_status") == "CLOSED_TEMPORARILY"
            else "desconocido"
        )
        if estado in ("cerrado", "posiblemente_cerrado"):
            continue
        place["servicios_sugeridos"] = ai.get("servicios") or []
        place["mensaje_acercamiento"] = (
            ai.get("mensaje") or place.get("mensajes", {}).get("whatsapp", "")
        )
        place["estado_operativo"] = estado
        results.append(place)

    results.sort(key=lambda r: (r.get("oportunidad") or {}).get("puntaje", 0), reverse=True)
    return {"results": results, "total": len(results)}


# ── Templates / Tags persistence (JSON file) ──────────────────────────

DEFAULT_TAGS = [
    {"id": "amigable", "nombre": "Amigable", "color": "#22c55e"},
    {"id": "profesional", "nombre": "Profesional", "color": "#3b82f6"},
    {"id": "directo", "nombre": "Directo", "color": "#f59e0b"},
    {"id": "consultivo", "nombre": "Consultivo", "color": "#8b5cf6"},
    {"id": "urgencia", "nombre": "Urgencia", "color": "#ef4444"},
    {"id": "descuento", "nombre": "Descuento", "color": "#ec4899"},
    {"id": "seguimiento", "nombre": "Seguimiento", "color": "#14b8a6"},
    {"id": "presentacion", "nombre": "Presentación", "color": "#f97316"},
    {"id": "recordatorio", "nombre": "Recordatorio", "color": "#6366f1"},
]

def get_templates_dir() -> str:
    base = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        return os.path.join(exe_dir, "templates")
    return os.path.join(base, "templates")

def _load_templates() -> list[dict]:
    d = get_templates_dir()
    f = os.path.join(d, "templates.json")
    if not os.path.exists(f):
        return []
    try:
        with open(f, "r", encoding="utf-8") as fp:
            return json.load(fp)
    except Exception:
        return []

def _save_templates(templates: list[dict]) -> None:
    d = get_templates_dir()
    os.makedirs(d, exist_ok=True)
    f = os.path.join(d, "templates.json")
    with open(f, "w", encoding="utf-8") as fp:
        json.dump(templates, fp, ensure_ascii=False, indent=2)

def _load_tags() -> list[dict]:
    d = get_templates_dir()
    f = os.path.join(d, "tags.json")
    if not os.path.exists(f):
        return []
    try:
        with open(f, "r", encoding="utf-8") as fp:
            return json.load(fp)
    except Exception:
        return []

def _save_tags(tags: list[dict]) -> None:
    d = get_templates_dir()
    os.makedirs(d, exist_ok=True)
    f = os.path.join(d, "tags.json")
    with open(f, "w", encoding="utf-8") as fp:
        json.dump(tags, fp, ensure_ascii=False, indent=2)

class TemplateData(BaseModel):
    id: str | None = None
    nombre: str = ""
    cuerpo: str = ""
    tags: list[str] = []

class TagData(BaseModel):
    id: str | None = None
    nombre: str = ""
    color: str = "#6b7280"

class GenerateMessageRequest(BaseModel):
    lead_info: dict = {}
    estilos: list[str] = []
    plantillas_referencia: list[dict] = []
    profile: dict | None = None

# ── WhatsApp WebSocket service (Node.js subprocess) ────────────────────

WHATSAPP_PORT = 11435
WHATSAPP_WS_URL = f"ws://127.0.0.1:{WHATSAPP_PORT}"
whatsapp_process: subprocess.Popen | None = None

def get_whatsapp_dir() -> str:
    if getattr(sys, 'frozen', False):
        # bundled in exe → archivos en sys._MEIPASS/whatsapp/
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            candidate = os.path.join(meipass, "whatsapp")
            if os.path.exists(os.path.join(candidate, "server.js")):
                return candidate
        # fallback: whatsapp/ junto al exe
        exe_dir = os.path.dirname(sys.executable)
        candidate = os.path.join(exe_dir, "whatsapp")
        if os.path.exists(os.path.join(candidate, "server.js")):
            return candidate
        # fallback: backend/whatsapp/ (estructura de desarrollo)
        candidate = os.path.join(exe_dir, "backend", "whatsapp")
        if os.path.exists(os.path.join(candidate, "server.js")):
            return candidate
        return os.path.join(exe_dir, "whatsapp")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp")

async def start_whatsapp_service():
    global whatsapp_process
    ws_dir = get_whatsapp_dir()
    server_js = os.path.join(ws_dir, "server.js")
    if not os.path.exists(server_js):
        return
    try:
        # Sesión en LOCALAPPDATA cuando está congelado para que persista entre reinicios
        if getattr(sys, 'frozen', False):
            local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
            session_dir = os.path.join(local_app, "MarketFinder", "whatsapp-session")
        else:
            session_dir = os.path.join(ws_dir, "session")
        os.makedirs(session_dir, exist_ok=True)
        env = os.environ.copy()
        env["WA_WS_PORT"] = str(WHATSAPP_PORT)
        env["WA_SESSION_DIR"] = session_dir
        whatsapp_process = subprocess.Popen(
            ["node", server_js],
            cwd=ws_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
            env=env,
        )
    except FileNotFoundError:
        pass

@app.on_event("startup")
async def seed_default_tags():
    tags = _load_tags()
    if not tags:
        _save_tags(DEFAULT_TAGS)

@app.on_event("startup")
async def startup_whatsapp():
    await start_whatsapp_service()

@app.on_event("shutdown")
async def shutdown_whatsapp():
    global whatsapp_process
    if whatsapp_process:
        try:
            whatsapp_process.kill()
        except Exception:
            pass

@app.get("/api/whatsapp/status")
async def whatsapp_status():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"http://127.0.0.1:{WHATSAPP_PORT}/health")
        if resp.status_code == 200:
            return {"wsUrl": WHATSAPP_WS_URL, "status": "connected"}
    except Exception:
        pass
    return {"wsUrl": WHATSAPP_WS_URL, "status": "disconnected"}

@app.get("/api/templates")
async def list_templates():
    return _load_templates()

@app.post("/api/templates")
async def upsert_template(data: TemplateData):
    templates = _load_templates()
    if data.id:
        for i, t in enumerate(templates):
            if t.get("id") == data.id:
                updated = data.model_dump()
                updated["updatedAt"] = datetime.now().isoformat()
                templates[i] = updated
                _save_templates(templates)
                return updated
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    else:
        new = data.model_dump()
        new["id"] = uuid.uuid4().hex[:12]
        now = datetime.now().isoformat()
        new["createdAt"] = now
        new["updatedAt"] = now
        templates.append(new)
        _save_templates(templates)
        return new

@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str):
    templates = _load_templates()
    filtered = [t for t in templates if t.get("id") != template_id]
    if len(filtered) == len(templates):
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    _save_templates(filtered)
    return {"ok": True}

@app.get("/api/tags")
async def list_tags():
    return _load_tags()

@app.post("/api/tags")
async def upsert_tag(data: TagData):
    tags = _load_tags()
    if data.id:
        for i, t in enumerate(tags):
            if t.get("id") == data.id:
                tags[i] = data.model_dump()
                _save_tags(tags)
                return tags[i]
        raise HTTPException(status_code=404, detail="Tag no encontrado")
    else:
        new = data.model_dump()
        new["id"] = uuid.uuid4().hex[:8]
        tags.append(new)
        _save_tags(tags)
        return new

@app.delete("/api/tags/{tag_id}")
async def delete_tag(tag_id: str):
    tags = _load_tags()
    filtered = [t for t in tags if t.get("id") != tag_id]
    if len(filtered) == len(tags):
        raise HTTPException(status_code=404, detail="Tag no encontrado")
    _save_tags(filtered)
    return {"ok": True}

@app.post("/api/generate-message")
async def generate_message(req: GenerateMessageRequest):
    lead = req.lead_info or {}
    estilos = req.estilos or []
    refs = req.plantillas_referencia or []
    profile = req.profile or {}

    system_prompt = (
        "Eres un redactor publicitario experto en marketing digital para negocios locales en México. "
        "Genera un mensaje de contacto breve, directo y persuasivo.\n\n"
        "IMPORTANTE: NO uses el nombre del cliente ni del negocio en el mensaje. "
        "Usa placeholders como [Negocio] donde vaya el nombre.\n"
        "El mensaje debe sonar natural, no genérico.\n"
    )

    if estilos:
        system_prompt += f"\nEstilo deseado: {' + '.join(estilos)}.\n"

    if refs:
        system_prompt += "\nEstos son ejemplos de mensajes que el usuario ha escrito antes (usa su estilo como referencia pero no copies textualmente):\n"
        for r in refs:
            body = r.get("cuerpo", "")[:300]
            system_prompt += f"- {body}\n"

    user_prompt = "Genera un mensaje de contacto para el siguiente negocio:\n"
    if lead.get("nombre"):
        user_prompt += f"Nombre: {lead['nombre']}\n"
    if lead.get("direccion_completa") or lead.get("direccion"):
        user_prompt += f"Dirección: {lead.get('direccion_completa') or lead['direccion']}\n"
    if lead.get("calificacion"):
        user_prompt += f"Calificación: {lead['calificacion']}/5\n"
    if lead.get("tipos") and len(lead["tipos"]) > 0:
        user_prompt += f"Tipo: {', '.join(lead['tipos'][:3])}\n"
    if lead.get("tiene_sitio_web") is False:
        user_prompt += "No tiene sitio web.\n"
    if profile.get("tuNombre") or profile.get("tuProfesion"):
        user_prompt += f"\nEl mensaje debe ser firmado por {profile.get('tuNombre', 'el usuario')}"
        if profile.get("tuProfesion"):
            user_prompt += f", {profile['tuProfesion']}"
        user_prompt += ".\n"
    if profile.get("tuPortafolio"):
        user_prompt += f"Portafolio de referencia: {profile['tuPortafolio']}\n"

    user_prompt += "\nResponde ÚNICAMENTE con el texto del mensaje, sin explicaciones ni prefijos."

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                },
            )
            data = resp.json()
            content = data.get("message", {}).get("content", "").strip()
            return {"mensaje": content}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al generar mensaje: {str(e)}")


# ── Profile persistence (JSON file) ──────────────────────────────────

def get_profiles_dir() -> str:
    base = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        return os.path.join(exe_dir, "profiles")
    return os.path.join(base, "profiles")

def _load_profiles() -> list[dict]:
    d = get_profiles_dir()
    f = os.path.join(d, "profiles.json")
    if not os.path.exists(f):
        return []
    try:
        with open(f, "r", encoding="utf-8") as fp:
            return json.load(fp)
    except Exception:
        return []

def _save_profiles(profiles: list[dict]) -> None:
    d = get_profiles_dir()
    os.makedirs(d, exist_ok=True)
    f = os.path.join(d, "profiles.json")
    with open(f, "w", encoding="utf-8") as fp:
        json.dump(profiles, fp, ensure_ascii=False, indent=2)

class ProfileData(BaseModel):
    id: str | None = None
    tuNombre: str = ""
    tuProfesion: str = ""
    tuExperiencia: str = ""
    tuPortafolio: str = ""
    tuMail: str = ""
    tuTelefono: str = ""

@app.get("/api/profiles")
async def list_profiles():
    return _load_profiles()

@app.post("/api/profiles")
async def upsert_profile(data: ProfileData):
    profiles = _load_profiles()
    if data.id:
        for i, p in enumerate(profiles):
            if p.get("id") == data.id:
                profiles[i] = data.model_dump()
                _save_profiles(profiles)
                return profiles[i]
        # ID not found — insert it (handles out-of-sync localStorage vs profiles.json)
        new = data.model_dump()
        profiles.append(new)
        _save_profiles(profiles)
        return new
    else:
        new = data.model_dump()
        new["id"] = uuid.uuid4().hex[:12]
        profiles.append(new)
        _save_profiles(profiles)
        return new

@app.delete("/api/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    profiles = _load_profiles()
    filtered = [p for p in profiles if p.get("id") != profile_id]
    if len(filtered) == len(profiles):
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    _save_profiles(filtered)
    return {"ok": True}


# ── Leads persistence (JSON file) ────────────────────────────────────

def _get_leads_path() -> str:
    base = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        return os.path.join(exe_dir, "leads", "leads.json")
    return os.path.join(base, "leads", "leads.json")

def _load_leads_for(profile_id: str) -> list[dict]:
    p = _get_leads_path()
    if not os.path.exists(p):
        return []
    try:
        with open(p, "r", encoding="utf-8") as fp:
            all_leads = json.load(fp)
        return all_leads.get(profile_id, [])
    except Exception:
        return []

def _save_leads_for(profile_id: str, leads: list[dict]) -> None:
    p = _get_leads_path()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    all_leads = {}
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8") as fp:
                all_leads = json.load(fp)
        except Exception:
            pass
    all_leads[profile_id] = leads
    with open(p, "w", encoding="utf-8") as fp:
        json.dump(all_leads, fp, ensure_ascii=False)

@app.get("/api/leads/{profile_id}")
async def get_leads(profile_id: str):
    return _load_leads_for(profile_id)

@app.post("/api/leads/{profile_id}")
async def post_leads(profile_id: str, leads: list[dict]):
    _save_leads_for(profile_id, leads)
    return {"ok": True}


def get_static_dir():
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, "static")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

STATIC_DIR = get_static_dir()

if os.path.exists(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
