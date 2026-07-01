/**
 * @module worker-client
 * @description Communication bridge to the FFmpeg Dedicated Web Worker.
 * Only the ping/pong handshake is implemented — no transcoding logic.
 */

/**
 * Verify that the FFmpeg Web Worker is reachable.
 *
 * Creates a dedicated `Worker` from `ffmpeg-worker.js`, sends a
 * `ping` message, and waits for a `pong` response. The worker is
 * terminated immediately after the handshake completes (or on
 * timeout / error).
 *
 * @returns {Promise<boolean>} `true` if the worker responded with
 *   `{ type: "pong" }`, otherwise `false`.
 */
export async function pingFFmpegWorker() {
    let worker;

    try {
        worker = new Worker(new URL("./ffmpeg-worker.js", import.meta.url), {
            type: "module"
        });

        const result = await new Promise((resolve) => {
            function onMessage(event) {
                clearTimeout(timer);
                worker.removeEventListener("message", onMessage);
                resolve(event.data && event.data.type === "pong");
            }

            const timer = setTimeout(() => {
                worker.removeEventListener("message", onMessage);
                resolve(false);
            }, 3000);

            worker.addEventListener("message", onMessage);
            worker.postMessage({ type: "ping" });
        });

        return result;
    } catch (_) {
        return false;
    } finally {
        if (worker) {
            try { worker.terminate(); } catch (_) { /* ignore */ }
        }
    }
}
