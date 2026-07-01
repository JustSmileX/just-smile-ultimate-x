/**
 * @module ffmpeg-loader
 * @description Lazy singleton loader for the FFmpeg WASM library.
 * No FFmpeg code has been integrated yet — this module provides
 * the caching layer and return contract for future phases.
 */

/** @type {object|null} */
let instance = null;

/**
 * Return the FFmpeg WASM singleton.
 *
 * On the first call a placeholder object is created and cached.
 * Every subsequent call returns the exact same reference.
 *
 * @returns {{loaded:boolean, version:string|null, instance:*}}
 */
export async function getFFmpeg() {
    if (instance === null) {
        instance = {
            loaded:   false,
            version:  null,
            instance: null
        };
    }

    return instance;
}
