/**
 * @module ffmpeg-worker
 * @description Dedicated Web Worker for FFmpeg WASM transcoding.
 * No FFmpeg library has been integrated yet — only the message
 * protocol skeleton is implemented.
 */

/**
 * Handle incoming messages from the main thread.
 *
 * Supported commands:
 *   `{ type: "ping" }` → `{ type: "pong" }`
 *
 * Unknown commands respond with an error payload.
 *
 * @listens message
 * @param {MessageEvent} event
 * @returns {void}
 */
self.addEventListener("message", (event) => {
    const data = event.data;

    if (!data || typeof data !== "object") {
        self.postMessage({ type: "error", message: "Unknown command" });
        return;
    }

    if (data.type === "ping") {
        self.postMessage({ type: "pong" });
        return;
    }

    self.postMessage({ type: "error", message: "Unknown command" });
});
