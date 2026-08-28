(() => {
  const style = document.createElement('style');
  style.dataset.visualRegression = 'deterministic-map-tiles';
  style.textContent = `
    .leaflet-tile {
      visibility: hidden !important;
    }

    .leaflet-tile-pane {
      background: #e7e9ec !important;
    }
  `;
  document.head.append(style);
})();
