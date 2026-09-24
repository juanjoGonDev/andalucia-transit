const NOTES_SEPARATOR = ' • ';
const PLACE_SEPARATOR = ' - ';

/**
 * Stop names follow the catalog "Núcleo - Lugar" convention and departures may append
 * service notes after ` • `. Compact labels (pinned bubble) show only the destination
 * nucleus ("Aguadulce") instead of the full stop name ("Aguadulce - La Gloria • nota").
 */
export function destinationNucleusLabel(destination: string): string {
  const withoutNotes = destination.split(NOTES_SEPARATOR)[0] ?? '';
  const separatorIndex = withoutNotes.indexOf(PLACE_SEPARATOR);
  const nucleus =
    separatorIndex >= 0 ? withoutNotes.slice(0, separatorIndex) : withoutNotes;
  const label = nucleus.trim();

  return label || destination.trim();
}
