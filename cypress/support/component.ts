import './commands';
import { mount } from 'cypress/angular';

declare module 'cypress' {
  interface Chainable<_Subject = unknown> {
    mount: typeof mount;
  }
}

Cypress.Commands.add('mount', mount);
