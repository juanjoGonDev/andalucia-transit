import type { SupportedLanguage } from '@core/config';

export const LEGAL_ROUTE_SEGMENTS = {
  base: 'legal',
  privacy: 'privacy',
  storage: 'storage',
  terms: 'terms',
  notice: 'notice'
} as const;

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

export function getLegalUiCopy(language: SupportedLanguage): LegalUiCopy {
  return UI_COPY[language];
}
