/**
 * Keyboard — pure input helpers used by AppComponent.onKeydown.
 *
 *   isTyping(target)   → true when the event target is a text input / textarea /
 *                       contentEditable region, so single-letter shortcuts can
 *                       yield to native typing.
 *   isModalOpen(state) → true while a modal overlay (editor or rename) is visible,
 *                       so global letter shortcuts are suppressed.
 *
 * No DOM mutation, no I/O, no Vue.  Exposed as window.Keyboard.
 */
window.Keyboard = {

    // True when the focused element accepts freeform text input.
    // Used to decide whether a single-key shortcut should be ignored.
   isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || !!target.isContentEditable;
    },

    // True while the editor or rename modal is on screen — global letter
    // shortcuts are suppressed in that state to avoid accidental modal actions.
   isModalOpen(state) {
    return !!(state.showEditor || state.showRename);
    }
};
