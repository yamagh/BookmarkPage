/**
 * Keyboard — pure input helpers used by AppComponent.onKeydown.
 *
 *   isTyping(target)   → true when the event target is a text input / textarea /
 *                       contentEditable region, so single-letter shortcuts can
 *                       yield to native typing.
 *   isModalOpen(overlay) → true while a blocking overlay (editor, settings, or
    *                       code view) is visible, so global letter shortcuts are
 *                       suppressed to avoid accidental modal actions.
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

     // True while a *blocking* overlay (editor / settings / code view) is on
       // screen — global letter shortcuts are suppressed. 'help' is intentionally
       // not blocking: its own key ('?') is handled by the component. The caller
       // passes a single overlay identity, so this module no longer tracks the
       // component's individual flag names.
   isModalOpen(overlay) {
    return overlay === 'editor' || overlay === 'settings' || overlay === 'code';
    }
};
