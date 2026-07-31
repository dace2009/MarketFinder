const TYPE_LABELS = {
  restaurant: 'restaurante', cafe: 'cafetería', bar: 'bar', night_club: 'discoteca',
  bakery: 'panadería', supermarket: 'supermercado', convenience_store: 'tienda de conveniencia',
  clothing_store: 'tienda de ropa', electronics_store: 'tienda de electrónica',
  furniture_store: 'tienda de muebles', hardware_store: 'ferretería',
  jewelry_store: 'joyería', shoe_store: 'zapatería', gym: 'gimnasio',
  beauty_salon: 'salón de belleza', hair_care: 'peluquería', spa: 'spa',
  dentist: 'consultorio dental', doctor: 'consultorio médico', pharmacy: 'farmacia',
  veterinary_care: 'veterinaria', pet_store: 'tienda de mascotas', hotel: 'hotel',
  real_estate_agency: 'inmobiliaria', lawyer: 'bufete de abogados',
  accountant: 'despacho contable', car_dealer: 'concesionaria', car_repair: 'taller mecánico',
  car_wash: 'lavado de autos', laundry: 'lavandería', travel_agency: 'agencia de viajes',
  school: 'escuela', movie_theater: 'cine',
}

function getServicioLabel(place) {
  for (const t of (place.tipos || [])) {
    if (TYPE_LABELS[t]) return TYPE_LABELS[t]
  }
  return 'negocio local'
}

export function fillMessage(template, place, profile) {
  const servicio = getServicioLabel(place)
  return template
    .replace(/\[Negocio\]/g, place.nombre || '[Negocio]')
    .replace(/\[Tu Nombre\]/g, profile?.tuNombre || '[Tu Nombre]')
    .replace(/\[Tu Profesión\]/g, profile?.tuProfesion || '[Tu Profesión]')
    .replace(/\[Tu Experiencia\]/g, profile?.tuExperiencia || '[Tu Experiencia]')
    .replace(/\[Tu Portafolio\]/g, profile?.tuPortafolio || '[Tu Portafolio]')
    .replace(/\[Tu Mail\]/g, profile?.tuMail || '[Tu Mail]')
    .replace(/\[Tu Teléfono\]/g, profile?.tuTelefono || '[Tu Teléfono]')
    .replace(/\[Servicio\/Producto\]/g, servicio)
    .replace(/\[Tema\/Servicio\]/g, servicio)
}

export const MESSAGE_BANK = [
  {
    id: 1,
    titulo: "Amigable y directo",
    texto: "¡Hola! Soy [Tu Nombre], [Tu Profesión].\n\nVi el perfil de [Negocio] y me gustó mucho lo que ofrecen. Creo que podrían llegar a más clientes con una mejor presencia digital.\n\n¿Te gustaría que te comparta una idea rápida para ayudar a [Negocio] a crecer?",
  },
  {
    id: 2,
    titulo: "Casual",
    texto: "¡Hola! Vi las redes de [Negocio] y me pareció interesante lo que hacen.\n\n[Tu Experiencia] y creo que podría ayudarles a que su negocio se vea más profesional y atraiga más clientes.\n\nSi quieren, les puedo mandar una idea sencilla de cómo mejorar su presencia digital.",
  },
  {
    id: 3,
    titulo: "Profesional",
    texto: "Buen día. Mi nombre es [Tu Nombre], [Tu Profesión].\n\nEstuve revisando la presencia digital de [Negocio] y veo una oportunidad para fortalecer su imagen, mejorar la claridad de su comunicación y proyectar una marca más profesional.\n\nMe gustaría compartirles una propuesta breve, sin compromiso.",
  },
  {
    id: 4,
    titulo: "Consultivo",
    texto: "¡Hola! ¿Cómo están?\n\nVi que en [Negocio] están ofreciendo [Servicio/Producto] y me dio curiosidad saber si actualmente tienen una estrategia digital definida o si la van construyendo sobre la marcha.\n\nSoy [Tu Profesión] y ayudo a negocios a tener una presencia más profesional, clara y consistente en el entorno digital.",
  },
  {
    id: 5,
    titulo: "Enfocado en resultados",
    texto: "¡Hola! Soy [Tu Nombre], [Tu Profesión].\n\nVi el perfil de [Negocio] y creo que con una mejor estrategia digital podrían comunicar más rápido su propuesta de valor, verse más profesionales y generar más confianza en posibles clientes.\n\n¿Les gustaría que les muestre una opción de paquete inicial para empezar?",
  },
  {
    id: 6,
    titulo: "Mini auditoría",
    texto: "¡Hola! Estuve viendo el perfil de [Negocio] y noté tres oportunidades rápidas:\n\n1. Mejorar la presentación de su marca.\n2. Optimizar la comunicación de sus servicios.\n3. Fortalecer su presencia digital.\n\n[Tu Experiencia]. ¿Les gustaría que les mande una propuesta breve sin costo?",
  },
  {
    id: 7,
    titulo: "Suave, sin presión",
    texto: "¡Hola! Les escribo porque vi el perfil de [Negocio] y me pareció que tienen una buena base para trabajar mejor su presencia digital.\n\nSoy [Tu Profesión] y ayudo a negocios a mejorar su imagen y alcance en el entorno digital.\n\nNo quiero quitarles mucho tiempo, pero si les interesa, puedo compartirles algunas ideas para potenciar [Negocio].",
  },
  {
    id: 8,
    titulo: "Cercano para emprendedores",
    texto: "¡Hola! Vi su emprendimiento y me gustó mucho lo que están haciendo con [Servicio/Producto].\n\n[Tu Experiencia]. Trabajo ayudando a emprendedores a verse más profesionales y atraer más clientes.\n\nCreo que su marca podría crecer mucho más con una mejor estrategia digital. ¿Les gustaría que les mande una idea?",
  },
  {
    id: 9,
    titulo: "Negocio local",
    texto: "¡Hola! Soy [Tu Nombre], [Tu Profesión].\n\nVi el perfil de [Negocio] y creo que podrían atraer muchos más clientes si mejoran su presencia digital.\n\nTrabajo con negocios ayudándoles a crecer mediante estrategias digitales efectivas y profesionales.\n\n¿Les gustaría que les comparta una propuesta sencilla?",
  },
  {
    id: 10,
    titulo: "Marca activa",
    texto: "¡Hola! Vi que en [Negocio] están activos en el entorno digital, eso es muy bueno.\n\nCreo que el siguiente paso podría ser mejorar la consistencia de su marca para que se vea más profesional y sea más fácil de reconocer.\n\n[Tu Experiencia] y puedo ayudarles con estrategias digitales adaptadas a su negocio.\n\n¿Les gustaría ver opciones?",
  },
  {
    id: 11,
    titulo: "Buen servicio, presencia mejorable",
    texto: "¡Hola! Vi lo que ofrecen en [Negocio] y me parece que tienen un [Servicio/Producto] con mucho potencial.\n\nTambién noté que su presencia digital podría ser más profesional para transmitir mejor el valor de lo que ofrecen.\n\n[Tu Experiencia]. Si les interesa, puedo compartirles algunas ideas concretas.",
  },
  {
    id: 12,
    titulo: "Breve y muy directo",
    texto: "¡Hola! Soy [Tu Nombre], [Tu Profesión].\n\nVi [Negocio] y creo que puedo ayudarles a mejorar su presencia digital para que sea más profesional y atraiga más clientes.\n\n¿Les puedo mandar una propuesta rápida?",
  },
  {
    id: 13,
    titulo: "Con oferta inicial",
    texto: "¡Hola! ¿Cómo están?\n\nEstoy ofreciendo un paquete inicial para negocios que quieren mejorar su presencia digital: incluye diagnóstico, estrategia básica y recomendaciones personalizadas.\n\nVi [Negocio] y creo que podría aplicar muy bien para ustedes.\n\n¿Les gustaría que les pase los detalles?",
  },
  {
    id: 14,
    titulo: "Enfocado en ahorrar tiempo",
    texto: "¡Hola! Soy [Tu Nombre], [Tu Profesión].\n\nSé que gestionar la parte digital de un negocio puede tomar mucho tiempo, especialmente cuando también hay que atender a los clientes.\n\nYo puedo ayudarles a optimizar la presencia digital de [Negocio] para que ustedes puedan enfocarse en lo que hacen mejor.\n\n¿Les gustaría que les comparta algunas opciones?",
  },
  {
    id: 15,
    titulo: "Marca personal",
    texto: "¡Hola! Vi el perfil de [Negocio] y me pareció interesante el contenido que comparten sobre [Servicio/Producto].\n\nCreo que podrían fortalecer mucho su marca con una estrategia digital más consistente.\n\n[Tu Experiencia] y puedo ayudarles a que su perfil se vea más profesional y sea más reconocible.\n\n¿Les gustaría que les mande una idea?",
  },
  {
    id: 16,
    titulo: "Estratégico",
    texto: "¡Hola! Estuve viendo el perfil de [Negocio] y creo que hay una buena oportunidad para mejorar la forma en que comunican sus servicios digitalmente.\n\nNo se trata solo de estar presente, sino de que cada acción digital ayude a explicar mejor lo que ofrecen, generar confianza y facilitar que las personas les contacten.\n\n[Tu Experiencia]. ¿Les gustaría que les comparta una propuesta?",
  },
  {
    id: 17,
    titulo: "Observación personalizada",
    texto: "¡Hola! Vi que ofrecen [Servicio/Producto] y me pareció una buena oportunidad para mejorar la presentación digital de esos servicios.\n\nCon una estrategia más clara y profesional, el mensaje podría llegar más lejos y verse más confiable.\n\nSoy [Tu Nombre], [Tu Profesión]. ¿Les gustaría que les mande una idea aplicada a [Negocio]?",
  },
  {
    id: 18,
    titulo: "Colaborativo",
    texto: "¡Hola! ¿Cómo están?\n\nMe gustaría proponerles una colaboración para mejorar la presencia digital de [Negocio].\n\n[Tu Experiencia], ayudando a que la marca mantenga una imagen más profesional y constante.\n\n¿Les gustaría que conversemos sobre lo que necesitan actualmente?",
  },
  {
    id: 19,
    titulo: "Premium",
    texto: "¡Hola! Mi nombre es [Tu Nombre], [Tu Profesión].\n\nAyudo a marcas y negocios a construir una presencia digital más cuidada, coherente y profesional, pensada para comunicar mejor sus servicios y elevar la percepción de valor de la marca.\n\nConsidero que [Negocio] tiene potencial para fortalecer su presencia digital. Me gustaría compartirles una propuesta breve.",
  },
  {
    id: 20,
    titulo: "Prueba / bajo compromiso",
    texto: "¡Hola! ¿Cómo están?\n\nVi el perfil de [Negocio] y creo que podríamos probar una mejora digital sencilla sin necesidad de iniciar con un plan grande.\n\nPodría prepararles un paquete inicial de acciones básicas para que vean cómo se vería su marca con una presencia más profesional.\n\n¿Les gustaría que les pase esa opción?",
  },
]
