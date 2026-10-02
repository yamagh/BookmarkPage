/**
 * TagPicker — the tag input + suggestion state machine.
 *
 * Concentrates the picker's per-keypress decisions (add, remove, navigate,
 * select) behind a thin interface.  No DOM, no Vue, no I/O.
 * Depends on window.Tags (suggest) and window.BookmarkUtils (toList).
 *
 *   create()               → fresh picker state
 *   reset(s)              → reset a picker state in place
 *   add(tagsStr, tag)      → append a tag to a comma-joined string
 *   remove(tagsStr, tag)   → drop a tag from a comma-joined string
 *   onKeydown(e, s, ctx) → drive the state machine; returns an action
 *   suggest(s, all, sel)   → filtered suggestions (delegates to Tags.suggest)
 */
window.TagPicker = {

  /** @returns {{ input: string, open: boolean, suggestionIndex: number }} */
  create() {
    return { input: '', open: false, suggestionIndex: -1 };
  },

  /** Reset a picker state to its initial values in place. */
  reset(s) {
    s.input = '';
    s.open = false;
    s.suggestionIndex = -1;
  },

  /**
   * Append a tag to a comma-joined tag string.
   * No-ops when the tag is already present.
   * @param {string} tagsStr  comma-joined tag string (from the form field)
   * @param {string} tag      new tag to append
   * @returns {string}        the updated tag string
   */
  add(tagsStr, tag) {
    const t = String(tag || '').trim();
    if (!t) return tagsStr;
    const existing = window.BookmarkUtils.toList(tagsStr);
    if (existing.includes(t)) return tagsStr;
    return existing.length ? tagsStr + ', ' + t : t;
  },

  /**
   * Remove a tag from a comma-joined tag string.
   * @param {string} tagsStr  comma-joined tag string
   * @param {string} tag      tag to remove
   * @returns {string}        the updated tag string
   */
  remove(tagsStr, tag) {
    const remaining = window.BookmarkUtils.toList(tagsStr).filter(t => t !== tag);
    return remaining.join(', ');
  },

  /**
   * Drive the picker state machine on a keydown.
   *
   * @param {KeyboardEvent} e
   * @param {{ input: string, open: boolean, suggestionIndex: number }} s
   *        picker state (mutated in place)
   * @param {{ suggestions: string[], lastTag: string|null }} ctx
   * @returns {{ add?: string, remove?: string, close?: boolean }|null}
   *          an action for the caller to apply, or null when inert.
   */
  onKeydown(e, s, ctx) {
    const { suggestions, lastTag } = ctx;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      s.open = true;
      if (!suggestions.length) return null;
      s.suggestionIndex = s.suggestionIndex < 0
         ? 0
         : Math.min(s.suggestionIndex + 1, suggestions.length - 1);
      return null;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      s.open = true;
      if (!suggestions.length) return null;
      s.suggestionIndex = s.suggestionIndex < 0
         ? suggestions.length - 1
         : Math.max(s.suggestionIndex - 1, 0);
      return null;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (s.suggestionIndex >= 0 && suggestions.length) {
        return { add: suggestions[s.suggestionIndex], close: true };
       }
      return { add: s.input };
    }
    if (e.key === 'Backspace' && !s.input && lastTag) {
      return { remove: lastTag };
    }
    return null;
  },

  /**
   * Compute filtered tag suggestions.
   * Delegates to Tags.suggest so filter / ranking logic lives in one place.
   * @param {{ input: string }} s       picker state
   * @param {string[]} all              all available tag names
   * @param {string[]} selected         tags already selected
   * @returns {string[]} filtered suggestions, max 30
   */
  suggest(s, all, selected) {
    return window.Tags.suggest(all, selected, s.input.trim().toLowerCase());
  }
};
