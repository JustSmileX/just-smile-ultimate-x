/**
 * @module mkv-parser
 * @description MKV container audio codec detection utilities.
 */

import { findTrackEntries } from "./track-parser.js";
import { readCodecId } from "./codec-parser.js";
import { codecIdToBrowserKey } from "./codec-map.js";
import { isBrowserCodecSupported } from "./browser-support.js";

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
 * Default result structure used when the file is not a valid MKV.
 * @returns {MkvAnalysis}
 */
function emptyResult() {
    return {
        valid:            false,
        container:        null,
        isMkv:            false,
        audioCodec:       null,
        videoCodec:       null,
        friendlyName:     null,
        browserCodec:     null,
        browserSupported: false,
        trackCount:       0,
        audioTracks:      [],
        videoTracks:      [],
        subtitleTracks:   []
    };
}

/**
 * Classify a raw CodecID string into audio, video, or subtitle.
 *
 * @param {string} codecId
 * @returns {"audio"|"video"|"subtitle"|null}
 */
function classifyCodecId(codecId) {
    if (codecId.startsWith("A_")) return "audio";
    if (codecId.startsWith("V_")) return "video";
    if (codecId.startsWith("S_")) return "subtitle";
    return null;
}

/**
 * Analyse an MKV file's EBML header and extract codec information.
 *
 * Reads the first 4096 bytes of the file, verifies the Matroska EBML
 * signature, locates TrackEntry elements, and reads the CodecID of
 * the first track.
 *
 * @param {File} file - A File object referencing an MKV container.
 * @returns {Promise<{
 *   valid:            boolean,
 *   container:        string|null,
 *   isMkv:            boolean,
 *   audioCodec:       string|null,
 *   videoCodec:       string|null,
 *   friendlyName:     string|null,
 *   browserCodec:     string|null,
 *   browserSupported: boolean,
 *   trackCount:       number,
 *   audioTracks:      Array,
 *   videoTracks:      Array,
 *   subtitleTracks:   Array
 * }>}
 * @throws {TypeError} If `file` is not a valid File instance.
 */
export async function detectMKVAudioCodec(file) {
    if (!(file instanceof File)) {
        throw new TypeError("detectMKVAudioCodec: expected a File instance");
    }

    if (file.size < 4) return emptyResult();

    const buffer = await file.slice(0, 4096).arrayBuffer();
    const view   = new Uint8Array(buffer);

    if (view[0] !== 0x1A || view[1] !== 0x45 || view[2] !== 0xDF || view[3] !== 0xA3) {
        return emptyResult();
    }

    const entries = findTrackEntries(view);

    let audioCodec      = null;
    let videoCodec      = null;
    let friendlyName    = null;
    let browserCodec    = null;
    let browserSupported = false;

    for (const entry of entries) {
        const codecId = readCodecId(view, entry.offset);

        if (!codecId) continue;

        const kind = classifyCodecId(codecId);

        if (kind === "audio") {
            audioCodec   = codecId;
            friendlyName = MKV_AUDIO_CODECS[codecId] || null;
            browserCodec = codecIdToBrowserKey(audioCodec);
            if (browserCodec) {
                try {
                    browserSupported = await isBrowserCodecSupported(browserCodec);
                } catch (_) {
                    browserSupported = false;
                }
            }
            break;
        }

        if (kind === "video" && videoCodec === null) {
            videoCodec = codecId;
        }
    }

    return {
        valid:            true,
        container:        "matroska",
        isMkv:            true,
        audioCodec,
        videoCodec,
        friendlyName,
        browserCodec,
        browserSupported,
        trackCount:       entries.length,
        audioTracks:      [],
        videoTracks:      [],
        subtitleTracks:   []
    };
}
