/**
 * @module codec-parser
 * @description Reads the CodecID string from a single TrackEntry
 * element. No track-type detection or container-level navigation
 * is performed.
 */

import { readElementId, readElementSize } from "./ebml-reader.js";

const decoder = new TextDecoder();

/**
 * EBML Element ID for CodecID (0x86).
 * @type {number}
 */
const ELEM_CODEC_ID = 0x86;

/**
 * Read the CodecID string inside a TrackEntry element.
 *
 * Navigation:
 *
 * ```
 * TrackEntry (0xAE)
 *   ├── TrackNumber
 *   ├── TrackType
 *   ├── CodecID (0x86)      ← target
 *   ├── CodecPrivate
 *   └── …
 * ```
 *
 * Only the CodecID element is parsed. The function scans the
 * TrackEntry's children, locates CodecID (0x86), and returns its
 * string value.
 *
 * @param {Uint8Array} view - Buffer containing the full MKV header.
 * @param {number} trackEntryOffset - Byte offset of the TrackEntry
 *   element's start (its 0xAE ID byte), as returned by
 *   {@link findTrackEntries}.
 * @returns {string|null} The CodecID string (e.g. `"A_AAC"`,
 *   `"A_EAC3"`, `"V_MPEG4/ISO/AVC"`), or `null` if no CodecID
 *   element is present.
 * @throws {TypeError} If `view` is not a Uint8Array or
 *   `trackEntryOffset` is invalid.
 */
export function readCodecId(view, trackEntryOffset) {
    if (!(view instanceof Uint8Array)) {
        throw new TypeError("readCodecId: view must be a Uint8Array");
    }

    if (typeof trackEntryOffset !== "number" ||
        !Number.isInteger(trackEntryOffset) ||
        trackEntryOffset < 0) {
        throw new TypeError(
            "readCodecId: trackEntryOffset must be a non-negative integer"
        );
    }

    if (trackEntryOffset >= view.length) {
        throw new TypeError("readCodecId: trackEntryOffset out of bounds");
    }

    let offset = trackEntryOffset;

    // ── Read TrackEntry ID + Data Size ────────────────────────────
    const entryId = readElementId(view, offset);
    offset += entryId.length;

    if (entryId.value !== 0xAE) return null;

    if (offset >= view.length) return null;

    const entrySize = readElementSize(view, offset);
    offset += entrySize.length;

    const entryEnd = offset + entrySize.value;

    // ── Scan children for CodecID (0x86) ──────────────────────────
    while (offset < entryEnd && offset < view.length) {
        const childId = readElementId(view, offset);
        offset += childId.length;

        if (offset >= view.length) return null;

        const childSize = readElementSize(view, offset);
        offset += childSize.length;

        if (childId.value === ELEM_CODEC_ID) {
            const bytes = view.slice(offset, offset + childSize.value);
            return decoder.decode(bytes);
        }

        offset += childSize.value;
    }

    return null;
}
