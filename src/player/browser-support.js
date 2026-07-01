/**
 * @module browser-support
 * @description Browser codec support detection using
 * `HTMLMediaElement.canPlayType()` and optionally
 * `MediaCapabilities.decodingInfo()`.
 */

/**
 * MIME type strings for `canPlayType()` lookups.
 * @type {Object<string, string>}
 */
const MIME_MAP = {
    aac:    'audio/mp4; codecs="mp4a.40.2"',
    ac3:    'audio/mp4; codecs="ac-3"',
    eac3:   'audio/mp4; codecs="ec-3"',
    dts:    'audio/vnd.dts',
    truehd: 'audio/truehd',
    flac:   'audio/flac',
    opus:   'audio/ogg; codecs="opus"',
    vorbis: 'audio/ogg; codecs="vorbis"',
    mp3:    'audio/mpeg',

    h264:   'video/mp4; codecs="avc1.42E01E"',
    h265:   'video/mp4; codecs="hev1.1.6.L120.90"',
    vp9:    'video/webm; codecs="vp9"',
    av1:    'video/mp4; codecs="av01.0.08M.08"'
};

/**
 * MediaCapabilities `decodingInfo()` config partials.
 *
 * Each entry supplies the `video` or `audio` property; the
 * `type: "file"` property is added at call time.
 *
 * @type {Object<string, object>}
 */
const MC_CONFIG_MAP = {
    aac:    { audio: { contentType: 'audio/mp4; codecs="mp4a.40.2"', channels: 2, samplerate: 44100, bitrate: 128000 } },
    ac3:    { audio: { contentType: 'audio/mp4; codecs="ac-3"',     channels: 6, samplerate: 48000, bitrate: 448000 } },
    eac3:   { audio: { contentType: 'audio/mp4; codecs="ec-3"',    channels: 6, samplerate: 48000, bitrate: 768000 } },
    dts:    { audio: { contentType: 'audio/vnd.dts',               channels: 6, samplerate: 48000, bitrate: 1509000 } },
    truehd: { audio: { contentType: 'audio/truehd',                channels: 8, samplerate: 48000, bitrate: 9000000 } },
    flac:   { audio: { contentType: 'audio/flac',                  channels: 2, samplerate: 44100, bitrate: 128000 } },
    opus:   { audio: { contentType: 'audio/ogg; codecs="opus"',    channels: 2, samplerate: 48000, bitrate: 128000 } },
    vorbis: { audio: { contentType: 'audio/ogg; codecs="vorbis"',  channels: 2, samplerate: 44100, bitrate: 128000 } },
    mp3:    { audio: { contentType: 'audio/mpeg',                  channels: 2, samplerate: 44100, bitrate: 128000 } },

    h264:   { video: { contentType: 'video/mp4; codecs="avc1.42E01E"',   width: 1920, height: 1080, bitrate: 5000000, framerate: 30 } },
    h265:   { video: { contentType: 'video/mp4; codecs="hev1.1.6.L120.90"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30 } },
    vp9:    { video: { contentType: 'video/webm; codecs="vp9"',         width: 1920, height: 1080, bitrate: 5000000, framerate: 30 } },
    av1:    { video: { contentType: 'video/mp4; codecs="av01.0.08M.08"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30 } }
};

/** @type {Object<string, boolean>} */
const cache = Object.create(null);

/**
 * Check whether the browser supports a given codec.
 *
 * Uses `HTMLMediaElement.canPlayType()` for the initial check.
 * If `navigator.mediaCapabilities.decodingInfo()` is available,
 * it is used to refine the result — a codec is considered
 * unsupported if the API explicitly reports `supported: false`.
 *
 * Results are cached so that repeated calls for the same key
 * resolve synchronously from the cache.
 *
 * @param {string} codecKey - Browser capability key
 *   (e.g. `"aac"`, `"eac3"`, `"h264"`, `"av1"`).
 * @returns {Promise<boolean>} `true` if the codec is supported.
 */
export async function isBrowserCodecSupported(codecKey) {
    if (typeof codecKey !== "string") return false;

    if (codecKey in cache) return cache[codecKey];

    const mime = MIME_MAP[codecKey];
    if (!mime) {
        cache[codecKey] = false;
        return false;
    }

    const el = isBrowserCodecSupported._el ||
               (isBrowserCodecSupported._el = document.createElement("video"));
    const canPlay = el.canPlayType(mime);

    if (canPlay === "") {
        cache[codecKey] = false;
        return false;
    }

    if (navigator.mediaCapabilities?.decodingInfo) {
        const config = MC_CONFIG_MAP[codecKey];

        if (config) {
            try {
                const result = await navigator.mediaCapabilities.decodingInfo({
                    type: "file",
                    ...config
                });

                if (!result.supported) {
                    cache[codecKey] = false;
                    return false;
                }
            } catch (_) {
                // Fall back to canPlayType result
            }
        }
    }

    cache[codecKey] = true;
    return true;
}
