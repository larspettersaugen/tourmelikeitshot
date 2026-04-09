/**
 * Opens the native date picker when the user activates the field (click/tap).
 * Browsers often only open the calendar from the calendar icon; this matches
 * clicking day/month/year segments to opening the picker too, where supported.
 */
export function tryShowDatePicker(input: HTMLInputElement) {
  if (input.type !== 'date') return;
  const show = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
  if (typeof show !== 'function') return;
  try {
    show.call(input);
  } catch {
    // NotAllowedError or unsupported environment
  }
}
