import type { SupportedLanguage } from '@core/config';

export const LEGAL_DOCUMENT_IDS = ['privacy', 'storage', 'terms', 'notice'] as const;
export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export interface LegalSection {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
}

export interface LegalDocument {
  readonly id: LegalDocumentId;
  readonly title: string;
  readonly summary: string;
  readonly updatedLabel: string;
  readonly updatedAt: string;
  readonly sections: readonly LegalSection[];
}

const UPDATED_AT = '29/08/2026' as const;

const ES_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Política de privacidad',
    summary:
      'Información sobre los datos y metadatos que pueden intervenir al utilizar Andalucia Transit, las funciones locales y los proveedores técnicos externos.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Alcance y minimización',
        paragraphs: [
          'Andalucia Transit es una aplicación informativa no oficial para consultar transporte público. Esta versión no incorpora cuentas de usuario, perfiles publicitarios, formularios de contacto ni un sistema propio de analítica comportamental.',
          'La aplicación limita el tratamiento a lo necesario para las funciones solicitadas. Eso no convierte toda conexión en anónima: los servicios que reciben solicitudes por Internet pueden recibir metadatos ordinarios de red, como dirección IP, fecha y hora, cabeceras técnicas y datos necesarios para entregar la respuesta.'
        ]
      },
      {
        title: '2. Información guardada en tu dispositivo',
        paragraphs: [
          'El navegador conserva localmente el idioma, la pestaña de inicio, búsquedas recientes, preferencias funcionales del buscador, paradas favoritas y la marca que recuerda si ya cerraste el aviso de privacidad y almacenamiento.',
          'Estos datos pertenecen al almacenamiento local del navegador. No crean una cuenta de usuario y pueden desaparecer al borrar los datos del sitio, usar navegación privada o cuando el propio navegador elimine su almacenamiento.'
        ]
      },
      {
        title: '3. Ubicación',
        paragraphs: [
          'La geolocalización es opcional y se solicita mediante el permiso del navegador sólo al activar una función que la necesita, por ejemplo localizar paradas cercanas o centrar un mapa. El resto de información debe seguir siendo consultable sin conceder ese permiso cuando la función no dependa de la posición.',
          'Puedes revocar el permiso desde el navegador o el sistema operativo. Las coordenadas se utilizan durante la operación solicitada para calcular proximidad o presentar resultados; cualquier solicitud posterior a servicios externos genera los metadatos técnicos normales de una conexión para esos proveedores.'
        ]
      },
      {
        title: '4. Servicios y proveedores externos',
        paragraphs: [
          'El cliente puede comunicarse directamente con servicios externos para obtener datos y recursos. Cada proveedor puede tratar los metadatos de conexión necesarios conforme a sus propias condiciones y a la normativa aplicable.'
        ],
        items: [
          'Red de Consorcios de Transporte de Andalucía (api.ctan.es): líneas, paradas, recorridos, horarios y otros datos de transporte.',
          'OpenStreetMap (tile.openstreetmap.org): teselas cartográficas descargadas cuando se muestran mapas.',
          'Google Fonts (fonts.googleapis.com y fonts.gstatic.com): hojas de estilo y archivos tipográficos utilizados por la interfaz actual.',
          'Nager.Date (date.nager.at): información de festivos utilizada para contextualizar horarios.',
          'Infraestructura de alojamiento, red y distribución del sitio: puede procesar registros técnicos necesarios para entregar, proteger y operar el servicio.'
        ]
      },
      {
        title: '5. Finalidades',
        paragraphs: [
          'El almacenamiento del dispositivo sirve para prestar funciones visibles, recordar elecciones y recuperar contenido que has decidido conservar localmente. La ubicación se usa para la acción concreta que la solicita. Las conexiones externas permiten obtener datos de transporte, mapas, tipografías y calendarios necesarios para esas funciones.',
          'El código revisado en esta versión no configura publicidad comportamental ni analítica de seguimiento. Si se incorporan nuevas finalidades, esta política y, cuando proceda, el mecanismo de consentimiento deberán actualizarse antes de activarlas.'
        ]
      },
      {
        title: '6. Conservación',
        paragraphs: [
          'El almacenamiento local permanece hasta que la aplicación lo sustituye, utilizas una función de borrado disponible o eliminas los datos del sitio desde el navegador. El aviso de privacidad sólo guarda una marca de que ya fue cerrado.',
          'Los plazos aplicados por proveedores externos o por la infraestructura de alojamiento a sus metadatos técnicos dependen de sus propias políticas y configuraciones. Andalucia Transit no presenta esos plazos como si fueran propios cuando no los controla.'
        ]
      },
      {
        title: '7. Derechos e identificación del responsable',
        paragraphs: [
          'Cuando un proveedor externo actúe como responsable de un tratamiento, los derechos de protección de datos deben ejercerse frente a ese responsable por los canales que publique. Si la explotación de este sitio genera tratamientos propios sujetos al RGPD, el responsable efectivo deberá facilitar la información exigida, incluida su identidad, datos de contacto, base jurídica, conservación y un canal para ejercer los derechos aplicables.',
          'Por decisión expresa de publicación, esta versión no incorpora datos personales ni datos de contacto privados del responsable del repositorio. Esta limitación no sustituye una obligación legal de identificación o contacto cuando resulte exigible.'
        ]
      },
      {
        title: '8. Cambios en esta política',
        paragraphs: [
          'Esta información debe revisarse cuando cambien los datos tratados, proveedores, almacenamiento local o finalidades. La fecha de actualización identifica la versión informativa vigente.'
        ]
      }
    ]
  },
  storage: {
    id: 'storage',
    title: 'Política de almacenamiento y cookies',
    summary:
      'Qué guarda Andalucia Transit en tu navegador, para qué sirve y por qué el aviso actual es informativo en lugar de un consentimiento para seguimiento.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Estado actual',
        paragraphs: [
          'El código de esta versión no configura cookies de analítica ni de publicidad comportamental y no incorpora seguimiento entre sitios. Utiliza almacenamiento local para funciones de la interfaz y carga recursos externos necesarios para mapas, tipografía, calendario y datos de transporte.',
          'Por ese motivo, el aviso inicial informa y puede cerrarse, pero no muestra un falso “Aceptar todo” para finalidades opcionales de seguimiento que actualmente no están configuradas.'
        ]
      },
      {
        title: '2. Almacenamiento local utilizado',
        paragraphs: [
          'Los siguientes identificadores pertenecen al almacenamiento local de la aplicación. No son una cuenta de usuario y permanecen en el navegador hasta su sustitución o borrado.'
        ],
        items: [
          'andalucia-transit.language: recuerda el idioma elegido.',
          'andalucia-transit.homeTab: recuerda la sección de inicio seleccionada.',
          'andalucia-transit.routeSearchHistory: conserva búsquedas recientes.',
          'andalucia-transit.routeSearchPreferences: conserva preferencias funcionales del buscador.',
          'andalucia-transit.stopFavorites: conserva las paradas marcadas como favoritas.',
          'andalucia-transit.privacyNotice.v1: recuerda que el aviso informativo de privacidad y almacenamiento ya fue cerrado.'
        ]
      },
      {
        title: '3. Cookies y tecnologías equivalentes',
        paragraphs: [
          'La normativa sobre almacenamiento en el terminal no se limita al nombre técnico “cookie”: también puede afectar a mecanismos equivalentes que guardan o recuperan información en el dispositivo. Por eso esta política documenta el almacenamiento local aunque esas preferencias no necesiten una cookie tradicional.',
          'La guía vigente de la AEPD contempla exenciones de consentimiento para determinadas tecnologías estrictamente necesarias para prestar un servicio expresamente solicitado y para determinadas preferencias elegidas por el usuario, siempre que no se reutilicen para otras finalidades. La transparencia sobre su uso sigue siendo necesaria como buena práctica.'
        ]
      },
      {
        title: '4. Recursos de terceros',
        paragraphs: [
          'Mostrar mapas, descargar tipografías o consultar datos externos genera solicitudes a OpenStreetMap, Google Fonts, CTAN y Nager.Date. Andalucia Transit no utiliza esas solicitudes para crear un perfil publicitario, pero los proveedores reciben los metadatos técnicos propios de una conexión y aplican sus políticas.',
          'Esta política no atribuye a un tercero una cookie concreta sin evidencia. Si un recurso pasara a instalar almacenamiento no exento desde esta aplicación, deberá revisarse antes de permitir su carga.'
        ]
      },
      {
        title: '5. Cómo borrar o impedir el almacenamiento',
        paragraphs: [
          'Puedes borrar los datos del sitio desde las opciones de privacidad del navegador. Al hacerlo se perderán las preferencias, búsquedas recientes y favoritos guardados localmente. Algunas funciones también ofrecen controles propios de borrado.',
          'Bloquear por completo el almacenamiento local puede impedir que la aplicación recuerde esas elecciones, pero no debe impedir el acceso básico a la información que no dependa de ellas.'
        ]
      },
      {
        title: '6. Si se añaden tecnologías no exentas',
        paragraphs: [
          'Antes de activar analítica no exenta, publicidad, personalización basada en perfil u otra tecnología que requiera consentimiento, la aplicación deberá impedir su instalación hasta obtener una elección válida. Aceptar y rechazar deberán ofrecerse con una facilidad y visibilidad equivalentes, junto con información clara y acceso a la configuración.',
          'La mera navegación, la inactividad o el silencio no deben utilizarse como consentimiento para esas finalidades.'
        ]
      }
    ]
  },
  terms: {
    id: 'terms',
    title: 'Condiciones de uso',
    summary:
      'Reglas básicas para utilizar Andalucia Transit y límites razonables de una aplicación informativa que depende de datos y servicios externos.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Naturaleza del servicio',
        paragraphs: [
          'Andalucia Transit es una aplicación informativa no oficial. No representa a la Junta de Andalucía, a los Consorcios de Transporte, a operadores, a OpenStreetMap ni a los demás proveedores que aparecen en la aplicación.',
          'El sitio es una herramienta de consulta. La aplicación no formaliza un contrato de transporte, una reserva, una compra de billete ni una garantía de prestación del servicio mostrado.'
        ]
      },
      {
        title: '2. Horarios, recorridos y disponibilidad',
        paragraphs: [
          'Horarios, paradas, líneas, noticias y recorridos pueden proceder de fuentes públicas o de terceros y pueden cambiar, contener errores, llegar con retraso o no estar disponibles temporalmente.',
          'Para decisiones críticas —incluidos transbordos, último servicio, accesibilidad, incidencias o cambios operativos— consulta también los canales oficiales del operador o consorcio correspondiente.'
        ]
      },
      {
        title: '3. Mapas, distancias y ubicación',
        paragraphs: [
          'Los mapas son una ayuda visual. Líneas, marcadores, distancias aproximadas y recorridos representados no sustituyen señalización, instrucciones oficiales, condiciones reales de la vía ni información de seguridad.',
          'La geolocalización es opcional y depende de la precisión del dispositivo y del navegador. No debe utilizarse como única fuente para una decisión de seguridad o navegación.'
        ]
      },
      {
        title: '4. Uso permitido',
        paragraphs: [
          'Puedes utilizar la aplicación para consultas y otros usos compatibles con las condiciones y licencias aplicables a sus datos y dependencias.',
          'No debes degradar el servicio, eludir límites técnicos, automatizar cargas abusivas contra APIs de terceros, introducir código malicioso, interferir con otras personas usuarias ni utilizar la aplicación para una finalidad ilícita.'
        ]
      },
      {
        title: '5. Servicios externos',
        paragraphs: [
          'Las fuentes de datos, teselas cartográficas, tipografías y APIs externas son servicios independientes. Su disponibilidad, condiciones y políticas pueden cambiar fuera del control de Andalucia Transit. Integrarlos técnicamente no implica patrocinio ni representación.'
        ]
      },
      {
        title: '6. Disponibilidad de la aplicación',
        paragraphs: [
          'La aplicación puede modificarse, suspender funciones o quedar temporalmente fuera de servicio por mantenimiento, fallos de red, cambios de proveedores o necesidades de seguridad. Se intentará evitar información engañosa y conservar degradaciones seguras cuando sea razonable.'
        ]
      },
      {
        title: '7. Marco aplicable',
        paragraphs: [
          'Estas condiciones se redactan para una aplicación dirigida principalmente a personas usuarias en España y se interpretan sin excluir los derechos imperativos que correspondan conforme a la normativa española y de la Unión Europea. Ninguna cláusula pretende limitar derechos que legalmente no puedan excluirse.'
        ]
      }
    ]
  },
  notice: {
    id: 'notice',
    title: 'Aviso legal',
    summary:
      'Información general sobre la naturaleza no oficial del sitio, sus fuentes y la limitación de identificación impuesta a esta versión pública.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Identificación de esta publicación',
        paragraphs: [
          'Este sitio publica la aplicación “Andalucia Transit”. Es un proyecto informativo no oficial y no se presenta como portal de una administración pública, consorcio u operador de transporte.',
          'Por decisión expresa de privacidad, esta versión no publica datos personales, domicilio, identificadores fiscales ni datos de contacto privados del responsable del repositorio.'
        ]
      },
      {
        title: '2. Límite de este aviso',
        paragraphs: [
          'Cuando resulte aplicable el deber de información del artículo 10 de la Ley 34/2002 (LSSI), la identidad y los datos de contacto exigibles del prestador deben estar disponibles de forma permanente, fácil, directa y gratuita. Este texto no inventa esos datos ni afirma que la limitación de publicación satisfaga por sí sola ese requisito.',
          'Si el modo de explotación del proyecto queda sometido a ese deber, la información del prestador deberá completarse por un canal adecuado antes de presentar este aviso como cumplimiento íntegro del artículo 10.'
        ]
      },
      {
        title: '3. Fuentes y atribución',
        paragraphs: [
          'Los datos de transporte se obtienen principalmente del Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía. Los mapas utilizan OpenStreetMap y deben conservar su atribución. Otras funciones pueden utilizar Nager.Date y Google Fonts.',
          'Las marcas, nombres, datos y contenidos de terceros pertenecen a sus respectivos titulares y se utilizan en el contexto permitido por las fuentes, licencias y condiciones aplicables.'
        ]
      },
      {
        title: '4. Responsabilidad sobre la información',
        paragraphs: [
          'Andalucia Transit procura presentar los datos de forma útil y comprensible, pero no controla todos los sistemas de origen ni puede garantizar que la información externa sea completa, exacta o esté disponible de forma continua. Las Condiciones de uso explican cómo interpretar horarios, mapas y estimaciones.'
        ]
      },
      {
        title: '5. Servicios externos',
        paragraphs: [
          'La aplicación puede solicitar o enlazar recursos gestionados por terceros. Cada tercero es responsable de su propio servicio, contenido y política. Un enlace o integración técnica no implica aprobación de todas sus prácticas ni una relación de representación.'
        ]
      },
      {
        title: '6. Legislación',
        paragraphs: [
          'El sitio se orienta a España y su marco legal se entiende sin perjuicio de las normas imperativas españolas y de la Unión Europea que resulten aplicables en cada caso.'
        ]
      }
    ]
  }
};

const EN_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy policy',
    summary:
      'Information about data and metadata that may be involved when using Andalucia Transit, local features and external technical providers.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Scope and minimisation',
        paragraphs: [
          'Andalucia Transit is an unofficial public-transport information application. This version does not include user accounts, advertising profiles, contact forms or its own behavioural analytics system.',
          'Processing is limited to what is needed for requested features. Internet connections are not inherently anonymous: services receiving requests may receive ordinary network metadata such as IP address, date and time, technical headers and information required to deliver a response.'
        ]
      },
      {
        title: '2. Information stored on your device',
        paragraphs: [
          'The browser stores language, the selected home tab, recent searches, functional search preferences, favourite stops and the marker recording whether the privacy and storage notice was dismissed.',
          'This information remains in browser local storage. It does not create a user account and may disappear when site data is cleared, private browsing is used or the browser removes its storage.'
        ]
      },
      {
        title: '3. Location',
        paragraphs: [
          'Geolocation is optional and is requested through browser permission only when you invoke a feature that needs it, such as nearby stops or centring a map. Other transport information should remain available without that permission when it does not depend on position.',
          'You can revoke permission in the browser or operating system. Coordinates are used for the requested operation to calculate proximity or present results; subsequent external requests generate ordinary technical connection metadata for those providers.'
        ]
      },
      {
        title: '4. External services and providers',
        paragraphs: [
          'The client may communicate directly with external services to obtain data and resources. Each provider may process connection metadata necessary for its service under its own terms and applicable law.'
        ],
        items: [
          'Andalusian Transport Consortium Network (api.ctan.es): lines, stops, routes, timetables and other transport data.',
          'OpenStreetMap (tile.openstreetmap.org): map tiles downloaded when maps are displayed.',
          'Google Fonts (fonts.googleapis.com and fonts.gstatic.com): stylesheets and font files used by the current interface.',
          'Nager.Date (date.nager.at): public-holiday information used to contextualise timetables.',
          'Site hosting, network and distribution infrastructure: may process technical logs needed to deliver, secure and operate the service.'
        ]
      },
      {
        title: '5. Purposes',
        paragraphs: [
          'Device storage provides visible features, remembers choices and restores content you chose to keep locally. Location is used for the action requesting it. External connections obtain transport data, maps, fonts and calendars required for those features.',
          'The code reviewed in this version does not configure behavioural advertising or tracking analytics. If new purposes are introduced, this policy and any required consent mechanism must be updated before they are enabled.'
        ]
      },
      {
        title: '6. Retention',
        paragraphs: [
          'Local storage remains until the application replaces it, you use an available clear action or you remove site data in the browser. The privacy notice stores only a marker recording that it was dismissed.',
          'Retention periods for technical metadata handled by external providers or hosting infrastructure depend on their policies and configuration. Andalucia Transit does not present those periods as its own when it does not control them.'
        ]
      },
      {
        title: '7. Rights and controller identification',
        paragraphs: [
          'Where an external provider is a controller, data-protection rights should be exercised against that provider using its published channels. If operating this site results in first-party processing subject to the GDPR, the effective controller must provide the required information, including identity, contact details, legal basis, retention and a channel for applicable rights.',
          'By explicit publication decision, this version does not include private personal details or private contact details for the repository owner. This limitation does not replace any identification or contact duty that applies by law.'
        ]
      },
      {
        title: '8. Changes to this policy',
        paragraphs: [
          'This information must be reviewed when processed data, providers, local storage or purposes change. The update date identifies the current information version.'
        ]
      }
    ]
  },
  storage: {
    id: 'storage',
    title: 'Storage and cookie policy',
    summary:
      'What Andalucia Transit stores in your browser, why it is stored and why the current notice is informational rather than consent for tracking.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Current state',
        paragraphs: [
          'The code in this version does not configure analytics or behavioural-advertising cookies and does not include cross-site tracking. It uses local storage for interface features and loads external resources required for maps, typography, calendars and transport data.',
          'The initial notice therefore informs and can be dismissed, but does not present a false “Accept all” choice for optional tracking purposes that are not currently configured.'
        ]
      },
      {
        title: '2. Local storage in use',
        paragraphs: [
          'The following identifiers belong to application local storage. They are not an account and remain in the browser until replaced or removed.'
        ],
        items: [
          'andalucia-transit.language: remembers the selected language.',
          'andalucia-transit.homeTab: remembers the selected home section.',
          'andalucia-transit.routeSearchHistory: keeps recent searches.',
          'andalucia-transit.routeSearchPreferences: keeps functional search preferences.',
          'andalucia-transit.stopFavorites: keeps stops marked as favourites.',
          'andalucia-transit.privacyNotice.v1: remembers that the privacy and storage information notice was dismissed.'
        ]
      },
      {
        title: '3. Cookies and equivalent technologies',
        paragraphs: [
          'Rules on terminal storage are not limited to mechanisms literally named cookies: equivalent mechanisms that store or retrieve information on a device may also be covered. This policy therefore documents local storage even though those preferences do not require a traditional cookie.',
          'Current AEPD guidance provides consent exemptions for certain technologies strictly necessary for an expressly requested service and certain user-selected preferences, provided they are not reused for other purposes. Transparency about their use remains appropriate.'
        ]
      },
      {
        title: '4. Third-party resources',
        paragraphs: [
          'Displaying maps, downloading fonts or consulting external data sends requests to OpenStreetMap, Google Fonts, CTAN and Nager.Date. Andalucia Transit does not use those requests to create advertising profiles, but the providers receive ordinary technical connection metadata and apply their own policies.',
          'This policy does not attribute a specific cookie to a third party without evidence. If a resource begins to place non-exempt storage through this application, it must be reviewed before being allowed to load.'
        ]
      },
      {
        title: '5. Removing or blocking storage',
        paragraphs: [
          'You can remove site data through browser privacy settings. Doing so removes locally saved preferences, recent searches and favourites. Some features also provide their own deletion controls.',
          'Blocking local storage entirely may prevent the application from remembering choices, but should not prevent basic access to information that does not depend on them.'
        ]
      },
      {
        title: '6. If non-exempt technologies are added',
        paragraphs: [
          'Before enabling non-exempt analytics, advertising, profile-based personalisation or another technology requiring consent, the application must prevent installation until a valid choice is obtained. Accepting and rejecting must be equally easy and visible, with clear information and access to settings.',
          'Mere browsing, inactivity or silence must not be used as consent for those purposes.'
        ]
      }
    ]
  },
  terms: {
    id: 'terms',
    title: 'Terms of use',
    summary:
      'Basic rules for using Andalucia Transit and reasonable limits for an information application that depends on external data and services.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Nature of the service',
        paragraphs: [
          'Andalucia Transit is an unofficial information application. It does not represent the Regional Government of Andalusia, transport consortia, operators, OpenStreetMap or other providers shown in the application.',
          'The site is a consultation tool. The application does not itself create a transport contract, reservation, ticket purchase or guarantee that a displayed service will operate.'
        ]
      },
      {
        title: '2. Timetables, routes and availability',
        paragraphs: [
          'Timetables, stops, lines, news and routes may come from public or third-party sources and may change, contain errors, arrive late or become temporarily unavailable.',
          'For critical decisions —including connections, last services, accessibility, disruption or operational changes— also consult official operator or transport-consortium channels.'
        ]
      },
      {
        title: '3. Maps, distances and location',
        paragraphs: [
          'Maps are a visual aid. Displayed lines, markers, approximate distances and routes do not replace signage, official instructions, actual road conditions or safety information.',
          'Geolocation is optional and depends on device and browser accuracy. It should not be the sole source for safety or navigation decisions.'
        ]
      },
      {
        title: '4. Permitted use',
        paragraphs: [
          'You may use the application for consultation and other uses compatible with the terms and licences applying to its data and dependencies.',
          'You must not degrade the service, bypass technical limits, generate abusive automated load against third-party APIs, introduce malicious code, interfere with other users or use the application unlawfully.'
        ]
      },
      {
        title: '5. External services',
        paragraphs: [
          'Data sources, map tiles, fonts and external APIs are independent services. Their availability, terms and policies may change outside Andalucia Transit control. Technical integration does not create sponsorship or representation.'
        ]
      },
      {
        title: '6. Application availability',
        paragraphs: [
          'The application may change, suspend features or become temporarily unavailable because of maintenance, network failures, provider changes or security needs. The project should avoid misleading information and preserve safe degradation where reasonable.'
        ]
      },
      {
        title: '7. Applicable framework',
        paragraphs: [
          'These terms are written for an application primarily directed at users in Spain and apply without excluding mandatory rights under Spanish and European Union law. No provision is intended to limit rights that cannot legally be waived.'
        ]
      }
    ]
  },
  notice: {
    id: 'notice',
    title: 'Legal notice',
    summary:
      'General information about the unofficial nature of the site, its sources and the identification limitation imposed on this public version.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Identification of this publication',
        paragraphs: [
          'This site publishes the application named “Andalucia Transit”. It is an unofficial information project and is not presented as a portal operated by a public administration, transport consortium or transport operator.',
          'By explicit privacy decision, this version does not publish the repository owner’s personal details, home address, tax identifiers or private contact details.'
        ]
      },
      {
        title: '2. Limitation of this notice',
        paragraphs: [
          'Where the information duty in Article 10 of Spanish Law 34/2002 (LSSI) applies, the required provider identity and contact information must be permanently, easily, directly and freely accessible. This text does not invent that information and does not claim that the publication limitation alone satisfies that requirement.',
          'If operation of the project is subject to that duty, provider information must be completed through an appropriate channel before presenting this notice as full Article 10 compliance.'
        ]
      },
      {
        title: '3. Sources and attribution',
        paragraphs: [
          'Transport information is obtained primarily from the Open Data Portal of the Andalusian Transport Consortium Network. Maps use OpenStreetMap and must retain its attribution. Other features may use Nager.Date and Google Fonts.',
          'Third-party names, marks, data and content belong to their respective owners and are used in the context allowed by applicable sources, licences and terms.'
        ]
      },
      {
        title: '4. Responsibility for information',
        paragraphs: [
          'Andalucia Transit aims to present information usefully and clearly, but it does not control every upstream system and cannot guarantee that external information is complete, accurate or continuously available. The Terms of Use explain how timetables, maps and estimates should be interpreted.'
        ]
      },
      {
        title: '5. External services',
        paragraphs: [
          'The application may request or link to resources managed by third parties. Each third party is responsible for its own service, content and policy. A link or technical integration does not imply approval of every practice or a relationship of representation.'
        ]
      },
      {
        title: '6. Law',
        paragraphs: [
          'The site is oriented to Spain and its legal framework applies without prejudice to mandatory Spanish and European Union rules applicable in each case.'
        ]
      }
    ]
  }
};

export function resolveLegalDocumentId(value: unknown): LegalDocumentId {
  return typeof value === 'string' && LEGAL_DOCUMENT_IDS.includes(value as LegalDocumentId)
    ? (value as LegalDocumentId)
    : 'privacy';
}

export function getLegalDocument(
  documentId: LegalDocumentId,
  language: SupportedLanguage
): LegalDocument {
  return (language === 'en' ? EN_DOCUMENTS : ES_DOCUMENTS)[documentId];
}
