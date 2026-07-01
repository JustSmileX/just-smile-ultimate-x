/**
 * @module transcoder
 * @description Transcode unsupported audio tracks in MKV files
 * to a browser-compatible format. No transcoding backend has been
 * integrated yet — this module provides the function signature
 * and return contract for future phases.
 */

/**
 * Attempt to transcode the audio stream of an MKV file whose
 * audio codec is not supported by the browser.
 *
 * The returned object describes the outcome of the operation.
 * Currently all calls return a placeholder result with
 * `success: false` and `outputFile: null`. This function will
 * be wired to a WASM-based decoder (e.g. FFmpeg) in a later
 * phase.
 *
 * @param {File} file - The source MKV file to transcode.
 * @param {object} [options={}] - Reserved for future configuration
 *   (target codec, quality preset, output container, etc.).
 * @returns {Promise<{
 *   success:    boolean,
 *   outputFile: File|null,
 *   audioCodec: string|null,
 *   videoCodec: string|null,
 *   duration:   number|null,
 *   cancelled:  boolean
 * }>}
 * @throws {TypeError} If `file` is not a File instance or `options`
 *   is not an object.
 */
export async function transcodeUnsupportedAudio(file, options = {}) {
    if (!(file instanceof File)) {
        throw new TypeError("transcodeUnsupportedAudio: expected a File instance");
    }

    if (typeof options !== "object" || options === null) {
        throw new TypeError("transcodeUnsupportedAudio: options must be an object");
    }

    return {
        success:    false,
        outputFile: null,
        audioCodec: null,
        videoCodec: null,
        duration:   null,
        cancelled:  false
    };
}
