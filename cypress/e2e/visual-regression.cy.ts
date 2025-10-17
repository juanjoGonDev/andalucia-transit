interface CompareSnapshotResult {
  readonly diffPixels: number;
  readonly diffPath: string;
  readonly baselineCreated: boolean;
}

type SnapshotScenario = {
  readonly name: string;
  readonly path: string;
};

describe('Visual regression', () => {
  const specName = Cypress.spec.name;
  const viewportWidth = 390;
  const viewportHeight = 844;
  const pixelDiffThreshold = 0;
  const scenarios: readonly SnapshotScenario[] = [
    { name: 'home-layout-es', path: '/' },
    { name: 'home-layout-en', path: '/?lang=en' }
  ];

  const captureAndAssert = ({ name, path }: SnapshotScenario) => {
    cy.viewport(viewportWidth, viewportHeight);
    cy.visit(path);
    cy.get('.shell-actions__button').should('be.visible');
    cy.screenshot(name, { capture: 'viewport', overwrite: true });
    cy.task<CompareSnapshotResult>('compareSnapshot', {
      specName,
      snapshotName: name,
      threshold: pixelDiffThreshold
    }).then((result) => {
      expect(result.diffPixels).to.equal(pixelDiffThreshold);
    });
  };

  scenarios.forEach((scenario) => {
    it(`matches baseline for ${scenario.name}`, () => {
      captureAndAssert(scenario);
    });
  });
});
