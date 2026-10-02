/**
 * OverlayManager — the overlay identity + blocking registry.
 *
 * Pure: no DOM, no Vue, no I/O.  Centralizes the overlay names
 * so Keyboard.isModalOpen and the component's toggle / close calls
 * stay in sync without duplicating the list.
 *
 *   blocking          → frozen list of overlay names that suppress keyboard
 *   isBlocking(name)  → true when the overlay suppresses global shortcuts
 *   toggle(cur, name) → open if not already active, close if it is
 */
window.OverlayManager = {

  /** Overlays that suppress global keyboard shortcuts. */
  blocking: Object.freeze(['editor', 'settings', 'code', 'menu']),

  /** @returns {boolean} true when the named overlay suppresses global shortcuts. */
  isBlocking(name) {
    return OverlayManager.blocking.includes(name);
  },

  /**
   * Toggle an overlay by identity: open when it's not already active,
   * close when it is.
   * @param {string|null} current  the active overlay name, or null
   * @param {string} name          the overlay to toggle
   * @returns {string|null}        the resulting overlay name (or null for closed)
   */
  toggle(current, name) {
    return current === name ? null : name;
  }
};
