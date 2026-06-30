/**
 * @module mkv-parser
 * @description MKV container audio codec detection utilities.
 * Parsing logic is not yet implemented — this module provides the
 * type definitions and function signature for future phases.
 */

/**
 * Map of Matroska audio codec IDs to human-readable names.
 * @enum {string}
 */
export const MKV_AUDIO_CODECS = {
    A_AAC:     "AAC",
    A_MPEG_L3: "MP3",
    A_OPUS:    "Opus",
    A_VORBIS:  "Vorbis",
    A_FLAC:    "FLAC",
    A_AC3:     "AC3",
    A_EAC3:    "E-AC3",
    A_DTS:     "DTS",
    A_TRUEHD:  "TrueHD",
    A_PCM:     "PCM",
    UNKNOWN:   "Unknown"
};

/**
 * Verify an MKV file by reading its EBML header.
 *
 * Reads the first 4096 bytes of the file and checks for the Matroska
 * EBML header signature (0x1A 0x45 0xDF 0xA3). No track or codec
 * parsing is performed in this step.
 *
 * @param {File} file - A File object referencing an MKV container.
 * @returns {Promise<{valid:boolean, buffer:ArrayBuffer, view:Uint8Array}|null>}
 *   An object with the raw buffer and view if the EBML header is valid,
 *   or `null` if the file is smaller than 4 bytes or is not an MKV.
 * @throws {TypeError} If `file` is not a valid File instance.
 */
export async function detectMKVAudioCodec(file) {
    if (!(file instanceof File)) {
        throw new TypeError("detectMKVAudioCodec: expected a File instance");
    }

    if (file.size < 4) return null;

    const buffer = await file.slice(0, 4096).arrayBuffer();
    const view   = new Uint8Array(buffer);

    if (view[0] !== 0x1A || view[1] !== 0x45 || view[2] !== 0xDF || view[3] !== 0xA3) {
        return null;
    }

    return { valid: true, buffer, view };
}
