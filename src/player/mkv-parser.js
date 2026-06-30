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
 * Extract the audio codec ID from an MKV file by reading its header.
 *
 * Reads the initial bytes of the file and parses the Matroska Element
 * structure to locate the audio track's CodecID element. The returned
 * string is one of the keys of {@link MKV_AUDIO_CODECS}.
 *
 * @param {File} file - A File object referencing an MKV container.
 * @returns {Promise<string|null>} The detected audio codec ID
 *   (e.g. `"A_AAC"`, `"A_AC3"`) or `null` if the file is not an MKV
 *   or has no audio track.
 * @throws {TypeError} If `file` is not a valid File instance.
 */
export async function detectMKVAudioCodec(file) {
    if (!(file instanceof File)) {
        throw new TypeError("detectMKVAudioCodec: expected a File instance");
    }

    return null;
}
