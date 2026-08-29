import { SupportedLanguage } from '@core/config';

export const LEGAL_DOCUMENT_IDS = ['privacy', 'storage', 'terms', 'notice'] as const;
export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export const LEGAL_ROUTE_SEGMENTS = {
  base: 'legal',
  privacy: 'privacy',
  storage: 'storage',
  terms: 'terms',
  notice: 'notice'
} as const;

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

export interface LegalLinkCopy {
  readonly privacy: string;
  readonly storage: string;
  readonly terms: string;
  readonly notice: string;
}

export interface LegalUiCopy {
  readonly footerLabel: string;
  readonly links: LegalLinkCopy;
  readonly notice: {
    readonly title: string;
    readonly message: string;
    readonly dismiss: string;
  };
}

const UPDATED_AT = '29/08/2026' as const;

const ES_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Política de privacidad',
    summary:
      'Información sobre los datos y metadatos que pueden intervenir al utilizar Andalucia Transit, cómo se usan las funciones locales y qué terceros técnicos participan.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Alcance y principio de minimización',
        paragraphs: [
          'Andalucia Transit es una aplicación informativa no oficial para consultar transporte público. La aplicación no incorpora registro de cuentas, perfiles publicitarios, formularios de contacto ni un sistema propio de analítica comportamental.',
          'La interfaz intenta limitar el tratamiento a la información necesaria para prestar las funciones solicitadas. Esto no significa que toda conexión sea anónima: al solicitar recursos o datos por Internet, los proveedores técnicos implicados pueden recibir metadatos ordinarios de red, como la dirección IP, fecha y hora de la solicitud, cabeceras técnicas y datos necesarios para entregar la respuesta.'
        ]
      },
      {
        title: '2. Información guardada en tu dispositivo',
        paragraphs: [
          'La aplicación utiliza almacenamiento local del navegador para recordar funciones que forman parte de la experiencia: idioma, pestaña de inicio, búsquedas recientes, preferencias de la vista previa de horarios, paradas favoritas y si ya se mostró el aviso de privacidad y almacenamiento.',
          'Estos valores se guardan en el navegador del dispositivo. No constituyen una cuenta de usuario y pueden desaparecer si borras los datos del sitio, utilizas navegación privada o el navegador elimina su almacenamiento.'
        ]
      },
      {
        title: '3. Ubicación',
        paragraphs: [
          'La geolocalización es opcional. El navegador solicita permiso cuando activas una función que necesita conocer tu posición, por ejemplo buscar paradas cercanas o centrar el mapa. Andalucia Transit no debe pedir acceso a la ubicación como requisito para consultar el resto de la información.',
          'El sistema operativo o navegador controla el permiso y permite revocarlo desde sus ajustes. Las coordenadas pueden utilizarse durante la operación solicitada para calcular proximidad y presentar resultados; las peticiones posteriores a servicios externos generan, como cualquier petición de red, metadatos técnicos para esos proveedores.'
        ]
      },
      {
        title: '4. Proveedores y servicios externos',
        paragraphs: [
          'Para prestar sus funciones, el cliente puede comunicarse directamente con servicios externos. Cada proveedor puede tratar los metadatos de conexión necesarios conforme a su propia política y a la normativa que le resulte aplicable.'
        ],
        items: [
          'Red de Consorcios de Transporte de Andalucía (api.ctan.es): datos de transporte, líneas, paradas, recorridos y horarios.',
          'OpenStreetMap (tile.openstreetmap.org): teselas cartográficas que se descargan al mostrar mapas.',
          'Google Fonts (fonts.googleapis.com y fonts.gstatic.com): hojas de estilo y archivos tipográficos usados por la interfaz actual.',
          'Nager.Date (date.nager.at): información de festivos utilizada para contextualizar horarios.',
          'Proveedor de alojamiento, red y distribución del sitio: puede procesar registros técnicos necesarios para entregar, proteger y operar el servicio.'
        ]
      },
      {
        title: '5. Finalidades',
        paragraphs: [
          'La información funcional del dispositivo se utiliza para prestar las características que ves en la aplicación, recordar elecciones y recuperar contenido que has decidido conservar localmente. La ubicación se utiliza para la acción concreta que la solicita. Las conexiones a terceros sirven para obtener datos, mapas, fuentes y calendarios necesarios para esas funciones.',
          'El código revisado en esta versión no configura publicidad comportamental ni analítica de seguimiento. Si se añadieran finalidades distintas, esta política y, cuando proceda, el mecanismo de consentimiento tendrían que actualizarse antes de activarlas.'
        ]
      },
      {
        title: '6. Conservación',
        paragraphs: [
          'El almacenamiento local permanece hasta que la aplicación lo sustituye, utilizas las funciones de borrado disponibles o eliminas los datos del sitio desde el navegador. El aviso de privacidad guarda únicamente una marca de que ya fue mostrado.',
          'Los plazos aplicados a metadatos técnicos por proveedores externos o por la infraestructura de alojamiento dependen de sus propias políticas y configuraciones. Andalucia Transit no presenta esos plazos como si fueran propios cuando no los controla.'
        ]
      },
      {
        title: '7. Derechos y responsables',
        paragraphs: [
          'Cuando un proveedor externo actúa como responsable de un tratamiento, los derechos de protección de datos se ejercen frente a ese responsable por los canales que publique. Si la explotación de este sitio da lugar a tratamientos propios sujetos al RGPD, el responsable efectivo deberá facilitar su identidad, sus datos de contacto, la base jurídica aplicable, los plazos y un canal para ejercer derechos conforme a los artículos 12 a 22 del RGPD.',
          'Por decisión expresa de publicación, esta versión no incorpora datos personales ni datos de contacto privados del responsable del repositorio. Esta omisión no pretende sustituir una obligación legal de identificación cuando resulte exigible.'
        ]
      },
      {
        title: '8. Cambios en esta política',
        paragraphs: [
          'La política debe revisarse cuando cambien los datos tratados, los proveedores, el almacenamiento local o las finalidades. La fecha de actualización permite identificar la versión informativa vigente.'
        ]
      }
    ]
  },
  storage: {
    id: 'storage',
    title: 'Política de almacenamiento y cookies',
    summary:
      'Qué guarda Andalucia Transit en tu navegador, para qué sirve y por qué el aviso actual es informativo en lugar de un consentimiento para analítica o publicidad.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Estado actual',
        paragraphs: [
          'El código de esta versión no configura cookies de analítica, publicidad comportamental ni seguimiento entre sitios. Utiliza almacenamiento local para funciones de la interfaz y puede cargar recursos de terceros necesarios para mapas, tipografía, calendario y datos de transporte.',
          'Por ese motivo, el aviso inicial de Andalucia Transit informa de estas tecnologías y puede cerrarse, pero no presenta un botón de “Aceptar todo” como si existieran finalidades opcionales de seguimiento que actualmente no están configuradas.'
        ]
      },
      {
        title: '2. Almacenamiento local utilizado',
        paragraphs: [
          'Los siguientes identificadores pertenecen al almacenamiento local de la aplicación. No son una cuenta y permanecen en el navegador hasta su sustitución o borrado.'
        ],
        items: [
          '`andalucia-transit.language`: recuerda el idioma elegido.',
          '`andalucia-transit.homeTab`: recuerda la sección de inicio seleccionada.',
          '`andalucia-transit.routeSearchHistory`: conserva búsquedas recientes para mostrarlas de nuevo.',
          '`andalucia-transit.routeSearchPreferences`: conserva preferencias funcionales del buscador, como la vista previa de horarios.',
          '`andalucia-transit.stopFavorites`: conserva las paradas que has marcado como favoritas.',
          '`andalucia-transit.privacyNotice.v1`: recuerda que el aviso informativo de privacidad y almacenamiento ya fue cerrado.'
        ]
      },
      {
        title: '3. Cookies y tecnologías equivalentes',
        paragraphs: [
          'La normativa sobre almacenamiento en el terminal no se limita al nombre técnico “cookie”. También puede afectar a mecanismos equivalentes que guardan o recuperan información en el dispositivo. Por eso esta política describe el almacenamiento local aunque la aplicación no necesite una cookie tradicional para esas preferencias.',
          'La guía vigente de la AEPD considera exentas de consentimiento determinadas tecnologías estrictamente necesarias para prestar un servicio expresamente solicitado y determinadas preferencias elegidas por el propio usuario, siempre que no se reutilicen para otras finalidades. La transparencia sigue siendo recomendable.'
        ]
      },
      {
        title: '4. Recursos de terceros',
        paragraphs: [
          'Mostrar mapas, descargar tipografías o consultar datos externos genera solicitudes a OpenStreetMap, Google Fonts, CTAN y Nager.Date. El código de Andalucia Transit no utiliza esas solicitudes para construir un perfil publicitario, pero los terceros reciben metadatos técnicos propios de una conexión y aplican sus políticas.',
          'Esta política no atribuye a esos terceros una cookie concreta sin evidencia. Si cualquiera de esos recursos pasara a instalar almacenamiento no exento desde esta aplicación, deberá revisarse el mecanismo antes de permitir su carga.'
        ]
      },
      {
        title: '5. Cómo borrar o impedir el almacenamiento',
        paragraphs: [
          'Puedes borrar los datos del sitio desde las opciones de privacidad del navegador. Al hacerlo se perderán preferencias, búsquedas recientes y favoritos guardados localmente. Algunas funciones también ofrecen controles propios para eliminar su contenido.',
          'Bloquear por completo el almacenamiento local puede impedir que la aplicación recuerde esas elecciones, pero no debe impedir el acceso básico a la información de transporte que no dependa de ellas.'
        ]
      },
      {
        title: '6. Si se añaden tecnologías no exentas',
        paragraphs: [
          'Antes de activar analítica no exenta, publicidad, personalización basada en perfil u otra tecnología que requiera consentimiento, Andalucia Transit deberá impedir su instalación hasta obtener una elección válida. Aceptar y rechazar deberán ofrecerse con una facilidad y visibilidad equivalentes, junto con información clara y acceso a la configuración correspondiente.',
          'La mera navegación o el silencio no deben utilizarse como consentimiento para esas finalidades.'
        ]
      }
    ]
  },
  terms: {
    id: 'terms',
    title: 'Condiciones de uso',
    summary:
      'Reglas básicas para utilizar Andalucia Transit y límites razonables de una aplicación informativa que depende de datos y servicios de terceros.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Naturaleza del servicio',
        paragraphs: [
          'Andalucia Transit es una aplicación informativa no oficial. No representa a la Junta de Andalucía, a los Consorcios de Transporte, a operadores de transporte, a OpenStreetMap ni a los demás proveedores de datos o infraestructura que aparecen en la aplicación.',
          'El uso del sitio implica utilizarlo como herramienta de consulta. No se formaliza mediante la aplicación un contrato de transporte, una reserva, una compra de billete ni una garantía de prestación del servicio mostrado.'
        ]
      },
      {
        title: '2. Horarios, recorridos y disponibilidad',
        paragraphs: [
          'Los horarios, paradas, líneas, noticias, recorridos y demás datos pueden proceder de fuentes públicas o de terceros y pueden cambiar, contener errores, retrasarse o no estar disponibles temporalmente. La interfaz puede mostrar datos en vivo, copias guardadas o estimaciones claramente identificadas por la propia función.',
          'Para decisiones críticas —incluidos viajes con conexión, último servicio, accesibilidad, incidencias o cambios operativos— consulta también los canales oficiales del operador o del consorcio correspondiente.'
        ]
      },
      {
        title: '3. Mapas, distancias y ubicación',
        paragraphs: [
          'Los mapas son una ayuda visual. Las líneas, marcadores, distancias aproximadas y recorridos representados no sustituyen señalización, instrucciones oficiales, condiciones reales de la vía ni información de seguridad.',
          'La geolocalización es opcional y depende de la precisión del dispositivo y del navegador. No debe utilizarse como único medio para tomar una decisión de seguridad o navegación.'
        ]
      },
      {
        title: '4. Uso permitido',
        paragraphs: [
          'Puedes utilizar la aplicación para consultas personales y otros usos compatibles con las condiciones y licencias aplicables a sus datos y dependencias.',
          'No debes intentar degradar el servicio, eludir límites técnicos, automatizar cargas abusivas contra APIs de terceros, introducir código malicioso, interferir con otras personas usuarias ni utilizar la aplicación para una finalidad ilícita.'
        ]
      },
      {
        title: '5. Servicios y enlaces de terceros',
        paragraphs: [
          'Las fuentes de datos, teselas de mapa, tipografías y APIs externas son servicios independientes. Su disponibilidad, condiciones y políticas pueden cambiar sin control de Andalucia Transit. El hecho de enlazarlos o consumirlos técnicamente no implica patrocinio ni una relación de representación.'
        ]
      },
      {
        title: '6. Disponibilidad de la aplicación',
        paragraphs: [
          'La aplicación puede modificarse, suspender funciones o quedar temporalmente fuera de servicio por mantenimiento, fallos de red, cambios en proveedores o necesidades de seguridad. Se intentará evitar información engañosa y conservar degradaciones seguras cuando sea técnicamente razonable.'
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
      'Información general sobre la naturaleza no oficial del sitio, las fuentes externas y el límite de identificación impuesto a esta versión pública.',
    updatedLabel: 'Última actualización',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Identificación de esta publicación',
        paragraphs: [
          'Este sitio publica la aplicación denominada “Andalucia Transit”. Es un proyecto informativo no oficial y no se presenta como portal de una administración pública, consorcio u operador de transporte.',
          'Por decisión expresa de privacidad, esta versión no publica datos personales, domicilio, identificadores fiscales ni datos de contacto privados del responsable del repositorio.'
        ]
      },
      {
        title: '2. Límite de este aviso',
        paragraphs: [
          'Cuando resulte aplicable el deber de información del artículo 10 de la Ley 34/2002 (LSSI), la identificación y los datos de contacto exigibles del prestador deben estar disponibles de forma permanente, fácil, directa y gratuita. Este texto no inventa esos datos ni afirma que la ausencia impuesta para esta publicación satisfaga por sí sola dicho requisito.',
          'Si el modo de explotación del proyecto queda sometido a ese deber, la información del prestador deberá completarse por un canal adecuado antes de presentar este aviso como cumplimiento íntegro del artículo 10.'
        ]
      },
      {
        title: '3. Fuentes y atribución',
        paragraphs: [
          'Los datos de transporte se obtienen principalmente del Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía. Los mapas utilizan OpenStreetMap y deben conservar la atribución que acompaña a las teselas. Otras funciones pueden utilizar Nager.Date y Google Fonts.',
          'Las marcas, nombres, datos y contenidos de terceros pertenecen a sus respectivos titulares y se usan únicamente en el contexto permitido por las fuentes, licencias y condiciones que correspondan.'
        ]
      },
      {
        title: '4. Responsabilidad sobre la información',
        paragraphs: [
          'Andalucia Transit procura presentar los datos de forma útil y comprensible, pero no controla todos los sistemas de origen ni puede garantizar que la información externa sea completa, exacta o esté disponible en todo momento. Las condiciones de uso explican cómo interpretar horarios, mapas y estimaciones.'
        ]
      },
      {
        title: '5. Enlaces y servicios externos',
        paragraphs: [
          'La aplicación puede solicitar o enlazar recursos gestionados por terceros. Cada tercero es responsable de su propio servicio, contenido y política. Un enlace o integración técnica no supone aprobación de todas sus prácticas ni una relación de representación.'
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
      'Information about data and metadata that may be involved when using Andalucia Transit, how local features work and which technical third parties participate.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Scope and data minimisation',
        paragraphs: [
          'Andalucia Transit is an unofficial information application for consulting public transport. The application does not include user accounts, advertising profiles, contact forms or its own behavioural analytics system.',
          'The interface aims to limit processing to information needed for requested features. This does not mean every Internet connection is anonymous: when resources or data are requested, the technical providers involved may receive ordinary network metadata such as IP address, request date and time, technical headers and information required to deliver a response.'
        ]
      },
      {
        title: '2. Information stored on your device',
        paragraphs: [
          'The application uses browser local storage for features that are part of the experience: language, home tab, recent searches, timetable-preview preferences, favourite stops and whether the privacy and storage notice has already been shown.',
          'These values remain in the browser on the device. They are not a user account and may disappear if you clear site data, use private browsing or the browser removes its storage.'
        ]
      },
      {
        title: '3. Location',
        paragraphs: [
          'Geolocation is optional. The browser requests permission when you activate a feature that needs your position, such as nearby stops or centring the map. Andalucia Transit should not require location access to consult the rest of the transport information.',
          'Your operating system or browser controls the permission and lets you revoke it. Coordinates may be used during the requested operation to calculate proximity and present results; subsequent requests to external services generate ordinary technical connection metadata for those providers.'
        ]
      },
      {
        title: '4. Providers and external services',
        paragraphs: [
          'To provide its features, the client may communicate directly with external services. Each provider may process connection metadata required for its service under its own policy and applicable law.'
        ],
        items: [
          'Andalusian Transport Consortium Network (api.ctan.es): transport, line, stop, route and timetable data.',
          'OpenStreetMap (tile.openstreetmap.org): map tiles downloaded when maps are displayed.',
          'Google Fonts (fonts.googleapis.com and fonts.gstatic.com): stylesheets and font files used by the current interface.',
          'Nager.Date (date.nager.at): public-holiday information used to contextualise timetables.',
          'Site hosting, network and distribution provider: may process technical logs required to deliver, secure and operate the service.'
        ]
      },
      {
        title: '5. Purposes',
        paragraphs: [
          'Device-local information is used to provide visible application features, remember choices and restore content you chose to keep locally. Location is used for the action that requested it. Third-party connections obtain data, maps, fonts and calendars needed for those features.',
          'The code reviewed for this version does not configure behavioural advertising or tracking analytics. If other purposes are added, this policy and, where required, the consent mechanism must be updated before they are enabled.'
        ]
      },
      {
        title: '6. Retention',
        paragraphs: [
          'Local storage remains until the application replaces it, you use an available clear action, or you remove site data in your browser. The privacy notice stores only a marker recording that the notice was dismissed.',
          'Retention periods for technical metadata handled by external providers or hosting infrastructure depend on their own policies and configuration. Andalucia Transit does not present those periods as its own when it does not control them.'
        ]
      },
      {
        title: '7. Rights and controllers',
        paragraphs: [
          'Where an external provider acts as controller, data-protection rights are exercised against that controller using its published channels. If operating this site results in first-party processing subject to the GDPR, the effective controller must provide its identity and contact details, applicable legal basis, retention periods and a channel for exercising rights under GDPR Articles 12 to 22.',
          'By explicit publication decision, this version does not include private personal details or private contact details for the repository owner. This omission is not intended to replace a legal identification duty where one applies.'
        ]
      },
      {
        title: '8. Changes to this policy',
        paragraphs: [
          'This policy must be reviewed when processed data, providers, local storage or purposes change. The update date identifies the current information version.'
        ]
      }
    ]
  },
  storage: {
    id: 'storage',
    title: 'Storage and cookie policy',
    summary:
      'What Andalucia Transit stores in your browser, why it is stored and why the current notice is informational rather than consent for analytics or advertising.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Current state',
        paragraphs: [
          'The code in this version does not configure analytics cookies, behavioural advertising or cross-site tracking. It uses local storage for interface features and may load third-party resources required for maps, typography, calendars and transport data.',
          'The initial Andalucia Transit notice therefore explains these technologies and can be dismissed, but it does not show an “Accept all” button as if optional tracking purposes were currently configured.'
        ]
      },
      {
        title: '2. Local storage in use',
        paragraphs: [
          'The following identifiers belong to application local storage. They are not an account and remain in the browser until replaced or removed.'
        ],
        items: [
          '`andalucia-transit.language`: remembers the selected language.',
          '`andalucia-transit.homeTab`: remembers the selected home section.',
          '`andalucia-transit.routeSearchHistory`: keeps recent searches so they can be shown again.',
          '`andalucia-transit.routeSearchPreferences`: keeps functional search preferences such as timetable previews.',
          '`andalucia-transit.stopFavorites`: keeps stops marked as favourites.',
          '`andalucia-transit.privacyNotice.v1`: remembers that the privacy and storage information notice was dismissed.'
        ]
      },
      {
        title: '3. Cookies and equivalent technologies',
        paragraphs: [
          'Rules on terminal storage are not limited to a mechanism literally named a cookie. Equivalent mechanisms that store or retrieve information on a device may also be covered. This policy therefore documents local storage even though the application does not need a traditional cookie for these preferences.',
          'Current AEPD guidance treats certain technologies strictly necessary for an expressly requested service and certain preferences chosen by the user as exempt from consent, provided they are not reused for other purposes. Transparency remains recommended.'
        ]
      },
      {
        title: '4. Third-party resources',
        paragraphs: [
          'Displaying maps, downloading fonts or consulting external data sends requests to OpenStreetMap, Google Fonts, CTAN and Nager.Date. Andalucia Transit code does not use those requests to create an advertising profile, but the providers receive technical connection metadata and apply their own policies.',
          'This policy does not attribute a specific cookie to a third party without evidence. If one of these resources begins to place non-exempt storage through this application, the mechanism must be reviewed before that resource is allowed to load.'
        ]
      },
      {
        title: '5. How to remove or block storage',
        paragraphs: [
          'You can remove site data through your browser privacy settings. Doing so removes locally saved preferences, recent searches and favourites. Some features also provide their own controls to delete their saved content.',
          'Blocking local storage entirely may prevent the application from remembering these choices, but should not prevent basic access to transport information that does not depend on them.'
        ]
      },
      {
        title: '6. If non-exempt technologies are added',
        paragraphs: [
          'Before enabling non-exempt analytics, advertising, profile-based personalisation or another technology requiring consent, Andalucia Transit must prevent installation until a valid choice is obtained. Accepting and rejecting must be equally easy and visible, with clear information and direct access to relevant settings.',
          'Mere browsing or silence must not be used as consent for those purposes.'
        ]
      }
    ]
  },
  terms: {
    id: 'terms',
    title: 'Terms of use',
    summary:
      'Basic rules for using Andalucia Transit and reasonable limits for an information application that depends on third-party data and services.',
    updatedLabel: 'Last updated',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. Nature of the service',
        paragraphs: [
          'Andalucia Transit is an unofficial information application. It does not represent the Regional Government of Andalusia, transport consortia, transport operators, OpenStreetMap or other data and infrastructure providers shown in the application.',
          'Use the site as a consultation tool. The application does not itself create a transport contract, reservation, ticket purchase or guarantee that a displayed service will operate.'
        ]
      },
      {
        title: '2. Timetables, routes and availability',
        paragraphs: [
          'Timetables, stops, lines, news, routes and other information may come from public or third-party sources and may change, contain errors, arrive late or be temporarily unavailable. The interface may show live data, saved snapshots or estimates identified by the relevant feature.',
          'For critical decisions —including connections, last services, accessibility, disruption or operational changes— also consult the official operator or transport-consortium channels.'
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
          'You may use the application for personal consultation and other uses compatible with the terms and licences that apply to its data and dependencies.',
          'You must not attempt to degrade the service, bypass technical limits, generate abusive automated load against third-party APIs, introduce malicious code, interfere with other users or use the application for unlawful purposes.'
        ]
      },
      {
        title: '5. Third-party services and links',
        paragraphs: [
          'Data sources, map tiles, fonts and external APIs are independent services. Their availability, terms and policies may change outside Andalucia Transit control. Linking to or technically consuming them does not create sponsorship or representation.'
        ]
      },
      {
        title: '6. Application availability',
        paragraphs: [
          'The application may change, suspend features or become temporarily unavailable because of maintenance, network failures, provider changes or security needs. The project should avoid misleading information and preserve safe degradation where technically reasonable.'
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
      'General information about the unofficial nature of the site, external sources and the identification limitation imposed on this public version.',
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
          'Where the information duty in Article 10 of Spanish Law 34/2002 (LSSI) applies, the required provider identity and contact information must be permanently, easily, directly and freely accessible. This text does not invent that information and does not claim that the publication constraint alone satisfies that requirement.',
          'If operation of the project is subject to that duty, provider information must be completed through an appropriate channel before presenting this notice as full Article 10 compliance.'
        ]
      },
      {
        title: '3. Sources and attribution',
        paragraphs: [
          'Transport information is obtained primarily from the Open Data Portal of the Andalusian Transport Consortium Network. Maps use OpenStreetMap and must retain the attribution accompanying map tiles. Other features may use Nager.Date and Google Fonts.',
          'Third-party names, marks, data and content belong to their respective owners and are used only in the context allowed by the applicable sources, licences and terms.'
        ]
      },
      {
        title: '4. Responsibility for information',
        paragraphs: [
          'Andalucia Transit aims to present information in a useful and understandable way, but it does not control every upstream system and cannot guarantee that external information is complete, accurate or continuously available. The Terms of Use explain how timetables, maps and estimates should be interpreted.'
        ]
      },
      {
        title: '5. External links and services',
        paragraphs: [
          'The application may request or link to resources managed by third parties. Each third party is responsible for its own service, content and policy. A link or technical integration does not imply approval of every third-party practice or a relationship of representation.'
        ]
      },
      {
        title: '6. Law',
        paragraphs: [
          'The site is oriented to Spain and its legal framework is understood without prejudice to mandatory Spanish and European Union rules applicable in each case.'
        ]
      }
    ]
  }
};

const UI_COPY: Record<SupportedLanguage, LegalUiCopy> = {
  es: {
    footerLabel: 'Información legal y privacidad',
    links: {
      privacy: 'Privacidad',
      storage: 'Almacenamiento y cookies',
      terms: 'Condiciones de uso',
      notice: 'Aviso legal'
    },
    notice: {
      title: 'Privacidad y almacenamiento local',
      message:
        'No usamos analítica ni publicidad. Guardamos preferencias y funciones locales en este dispositivo y algunos recursos se cargan desde proveedores externos. Consulta los detalles cuando quieras.',
      dismiss: 'Entendido'
    }
  },
  en: {
    footerLabel: 'Legal and privacy information',
    links: {
      privacy: 'Privacy',
      storage: 'Storage and cookies',
      terms: 'Terms of use',
      notice: 'Legal notice'
    },
    notice: {
      title: 'Privacy and local storage',
      message:
        'We do not use analytics or advertising. Preferences and functional state are stored on this device, and some resources load from external providers. You can review the details at any time.',
      dismiss: 'Got it'
    }
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

export function getLegalUiCopy(language: SupportedLanguage): LegalUiCopy {
  return UI_COPY[language];
}
