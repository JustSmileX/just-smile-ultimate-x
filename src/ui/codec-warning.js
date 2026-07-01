/**
 * @module codec-warning
 * @description Reusable UI component for displaying unsupported
 * media codec warnings during video playback.
 */

const CLASS_WARNING   = "codec-warning";
const CLASS_CONTENT   = "codec-warning-content";
const CLASS_ICON      = "codec-warning-icon";
const CLASS_HEADER    = "codec-warning-header";
const CLASS_CODEC     = "codec-warning-codec";
const CLASS_MESSAGE   = "codec-warning-message";
const CLASS_CLOSE     = "codec-warning-close";

/**
 * Create the warning DOM tree and store a reference.
 * @returns {HTMLElement}
 */
function createElement() {
    const root = document.createElement("div");
    root.className = CLASS_WARNING;

    root.innerHTML =
        `<div class="${CLASS_CONTENT}">` +
            `<div class="${CLASS_ICON}">⚠</div>` +
            `<div class="${CLASS_HEADER}">Unsupported Audio Codec</div>` +
            `<div class="${CLASS_CODEC}"></div>` +
            `<div class="${CLASS_MESSAGE}"></div>` +
            `<button class="${CLASS_CLOSE}" aria-label="Close warning">Close</button>` +
        `</div>`;

    return root;
}

/** @type {HTMLElement|null} */
let warningEl = null;

/**
 * Display an unsupported codec warning in the player overlay.
 *
 * Creates the element on first call and reuses it thereafter.
 * Appends to `document.body`. The caller is responsible for
 * positioning via the `.codec-warning` CSS class.
 *
 * @param {{codec:string, message:string}} options
 *   - `codec`: raw Matroska CodecID (e.g. `"A_EAC3"`).
 *   - `message`: user-facing explanation.
 * @returns {void}
 */
export function showCodecWarning(options) {
    if (!options || typeof options !== "object") return;

    if (!warningEl) {
        warningEl = createElement();

        warningEl.querySelector(`.${CLASS_CLOSE}`).addEventListener("click", () => {
            hideCodecWarning();
        });
    }

    const codecEl  = warningEl.querySelector(`.${CLASS_CODEC}`);
    const msgEl    = warningEl.querySelector(`.${CLASS_MESSAGE}`);

    codecEl.textContent = options.codec;
    msgEl.textContent   = options.message;

    if (!warningEl.parentNode) {
        document.body.appendChild(warningEl);
    }
}

/**
 * Hide and remove the codec warning element from the DOM.
 * @returns {void}
 */
export function hideCodecWarning() {
    if (warningEl && warningEl.parentNode) {
        warningEl.parentNode.removeChild(warningEl);
    }
}
