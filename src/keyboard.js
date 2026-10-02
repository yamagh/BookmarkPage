/**
 * Keyboard — pure input helpers used by AppComponent.onKeydown.
 *
 *   isTyping(target)     → true when the event target is a text input / textarea /
 *                       contentEditable region, so single-letter shortcuts can
 *                       yield to native typing.
 *   isModalOpen(overlay) → true while a blocking overlay (editor, settings, code,
 *                       or manage menu) is visible, so global letter shortcuts are
 *                       suppressed.  Delegates to OverlayManager.isBlocking.
 *   route(e, ctx)        → action name (or null). Pure routing table
 *                       mapping a keydown event + component context to one
 *                       of 10 action names. The component dispatches on the
 *                       returned name; this module owns all guard logic.
 * No DOM mutation, no I/O, no Vue.  Exposed as window.Keyboard.
 * Depends on window.OverlayManager (loaded before this file).
 */
window.Keyboard = {

    // True when the focused element accepts freeform text input.
    // Used to decide whether a single-key shortcut should be ignored.
   isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || !!target.isContentEditable;
    },

  // Blocking overlay decision is centralized in OverlayManager so the
  // list stays in sync with the component that opens and closes them.
  isModalOpen(overlay) {
    return window.OverlayManager.isBlocking(overlay);
    },

     /**
     * Route a keydown event to an action name, or null if no shortcut fires.
     *
     * Context is passed in rather than read from the DOM so the routing
     * table stays pure and testable without a Vue instance.
     *
     * Action names:
     *   close   → closeAllModals()     (Escape; always active)
     *   search  → focusQueryInput()    ( / )
     *   new     → addBookmark()        ( n / N )
     *   theme   → toggleTheme()        ( t / T )
     *   help    → toggleHelp()         ( ? — active when help overlay is open too )
     *   next    → focusNextCard()      ( j / J / ArrowDown )
     *   prev    → focusPrevCard()      ( k / K / ArrowUp )
     *   open    → openFocusedCard()    ( Enter, when no text field is focused )
     *   edit    → editFocusedCard()    ( Ctrl+e / Cmd+e )
     *   delete  → deleteFocusedCard()  ( Ctrl+Backspace / Cmd+Backspace )
     *
     * The caller should call preventDefault() for every action other than
     * 'close' (Escape is intentionally not suppressed so the browser
     * retains its native close gesture).
     *
     * @param {KeyboardEvent} e
     * @param {{ isTyping: boolean, overlay: string|null }} ctx
     * @returns {string|null}
     */
    route(e, ctx) {
      // Escape: highest priority, always closes the active overlay.
      if (e.key === 'Escape') return 'close';

      // Blocking modal → suppress all global shortcuts.
      if (Keyboard.isModalOpen(ctx.overlay)) return null;

      // Help overlay: ? toggles it; every other key is inert.
      if (ctx.overlay === 'help') {
        return e.key === '?' ? 'help' : null;
      }

      const typing = ctx.isTyping;
      const hasMod = e.ctrlKey || e.metaKey;

      // Modifier combos: inert while the user is inside a text field
      // (preserves native Cmd+C / Ctrl+C, etc.).
      if (hasMod) {
        if (typing) return null;
        const key = e.key.toLowerCase();
        if (key === 'e') return 'edit';
        if (key === 'backspace') return 'delete';
        return null;
      }

      // Alt combinations are left to the browser (native navigation).
      if (e.altKey) return null;

      // Single letters / arrow keys — inert while the user is typing.
      if (typing) return null;

      switch (e.key) {
        case '/':               return 'search';
        case 'n': case 'N':   return 'new';
        case 't': case 'T':   return 'theme';
        case '?':               return 'help';
        case 'j': case 'J':
        case 'ArrowDown':      return 'next';
        case 'k': case 'K':
        case 'ArrowUp':        return 'prev';
        case 'Enter':           return 'open';
      }
      return null;
     }
};
