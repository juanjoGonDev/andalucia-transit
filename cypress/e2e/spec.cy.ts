describe('Home page', () => {
  it('renders navigation menu', () => {
    cy.visit('/');
    cy.get('nav a').should('have.length', 4);
  });
});
