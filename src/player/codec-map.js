/**
 * @module codec-map
 * @description Maps Matroska CodecID strings to the browser
 * capability keys used by `getMediaCapabilities()`.
 */

/**
 * Map of Matroska CodecID values to browser capability keys.
 *
 * Audio keys correspond to the `audio` property of the object
 * returned by `getMediaCapabilities()`; video keys correspond
 * to the `video` property.
 *
 * @enum {string}
 */
export const MKV_BROWSER_CODEC_MAP = {
    // Audio
    A_AAC:      "aac",
    A_AC3:      "ac3",
    A_EAC3:     "eac3",
    A_DTS:      "dts",
    A_TRUEHD:   "truehd",
    A_FLAC:     "flac",
    A_OPUS:     "opus",
    A_VORBIS:   "vorbis",
    A_MPEG_L3:  "mp3",

    // Video
    "V_MPEG4/ISO/AVC":  "h264",
    "V_MPEGH/ISO/HEVC": "h265",
    V_VP9:  "vp9",
    V_AV1:  "av1"
};

/**
 * Convert a Matroska CodecID to the corresponding browser
 * capability key.
 *
 * @param {string} codecId - A Matroska CodecID string
 *   (e.g. `"A_AAC"`, `"V_MPEG4/ISO/AVC"`).
 * @returns {string|null} The mapped browser key
 *   (e.g. `"aac"`, `"h264"`), or `null` if no mapping exists.
 */
export function codecIdToBrowserKey(codecId) {
    if (typeof codecId !== "string") return null;

    return MKV_BROWSER_CODEC_MAP[codecId] ?? null;
}
