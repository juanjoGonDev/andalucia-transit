import {
  MapStopMarkerRole,
  MapStopRolePalette,
  resolveStopMarkerRadius,
  resolveStopMarkerStyle
} from '@shared/map/map-marker-style';

const palette: MapStopRolePalette = {
  regular: '#0f9d58',
  origin: '#0061fe',
  destination: '#d93025',
  highlight: '#060f2b',
  stroke: '#ffffff',
  highlightStroke: '#f59e0b'
};

describe('map marker style', () => {
  it('keeps regular stops on the baseline visual', () => {
    const style = resolveStopMarkerStyle('regular', false, palette);

    expect(style.fillColor).toBe(palette.regular);
    expect(style.color).toBe(palette.stroke);
    expect(resolveStopMarkerRadius('regular', false)).toBeLessThan(
      resolveStopMarkerRadius('origin', false)
    );
  });

  it('differentiates the searched origin and destination from regular stops', () => {
    const origin = resolveStopMarkerStyle('origin', false, palette);
    const destination = resolveStopMarkerStyle('destination', false, palette);
    const regular = resolveStopMarkerStyle('regular', false, palette);

    expect(origin.fillColor).toBe(palette.origin);
    expect(destination.fillColor).toBe(palette.destination);
    expect(origin.fillColor).not.toBe(regular.fillColor);
    expect(destination.fillColor).not.toBe(regular.fillColor);
    expect(origin.weight).toBeGreaterThan(regular.weight);
    expect(destination.weight).toBeGreaterThan(regular.weight);
  });

  it('makes the active selection unmistakable for every role', () => {
    const roles: readonly MapStopMarkerRole[] = ['regular', 'origin', 'destination'];

    for (const role of roles) {
      const style = resolveStopMarkerStyle(role, true, palette);

      expect(style.fillColor).toBe(palette.highlight);
      expect(style.color).toBe(palette.highlightStroke);
      expect(style.role).toBe(role);
      expect(resolveStopMarkerRadius(role, true)).toBeGreaterThan(
        resolveStopMarkerRadius(role, false)
      );
    }
  });
});
