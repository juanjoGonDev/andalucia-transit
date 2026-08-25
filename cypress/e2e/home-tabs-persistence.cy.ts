describe('Home tabs persistence', () => {
  const favoritesLabel = 'Favoritas';
  const favoritesPath = '/favs';
  const homePath = '/';
  const tabQueryParam = 'tab';
  const favoritesTabId = 'favorites';

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('persists the favorites tab selection across navigation', () => {
    cy.visit(homePath);
    cy.get('[role="tablist"]').within(() => {
      cy.contains(favoritesLabel).click();
    });

    cy.location('pathname').should('eq', favoritesPath);
    cy.location('search').should('eq', `?${tabQueryParam}=${favoritesTabId}`);
    cy.get('[role="tab"][aria-selected="true"]').should('contain', favoritesLabel);

    cy.visit('/map');
    cy.go('back');

    cy.location('pathname').should('eq', favoritesPath);
    cy.location('search').should('eq', `?${tabQueryParam}=${favoritesTabId}`);
    cy.get('[role="tab"][aria-selected="true"]').should('contain', favoritesLabel);

    cy.visit(homePath);

    cy.location('pathname').should('eq', favoritesPath);
    cy.location('search').should('eq', `?${tabQueryParam}=${favoritesTabId}`);
    cy.get('[role="tab"][aria-selected="true"]').should('contain', favoritesLabel);
  });
});
