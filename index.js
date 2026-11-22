/**
 * Host half of the earnings-clock bundle.
 *
 * The plugin is fully client-side on purpose: the work hours / daily wage are
 * a personal display preference, and the browser GUI already persists such
 * preferences locally. Nothing on the Host needs to know them, so this half
 * only makes the bundle loadable.
 */
export function apply() {}
