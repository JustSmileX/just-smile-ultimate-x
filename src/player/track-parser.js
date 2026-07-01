/**
 * @module track-parser
 * @description Locates TrackEntry elements inside an EBML-structured
 * byte buffer. No codec, audio, or video parsing is performed.
 */

import { readElementId, readElementSize } from "./ebml-reader.js";

/**
 * Element IDs used during TrackEntry discovery.
 */
const ELEM = {
    SEGMENT:     0x18538067,
    TRACKS:      0x1654AE6B,
    TRACK_ENTRY: 0xAE
};

/**
 * Skip past the EBML header (ID + size + body) and return the offset
 * of the first top-level child element.
 *
 * @param {Uint8Array} view
 * @returns {number} Offset immediately after the EBML header body.
 */
function skipEbmlHeader(view) {
    let offset = 0;

    const id = readElementId(view, offset);
    offset += id.length;

    const sz = readElementSize(view, offset);
    offset += sz.length;

    offset += sz.value;
    return offset;
}

/**
 * Locate the Segment element after the EBML header.
 *
 * Scans top-level elements until an element with the Segment ID
 * (0x18538067) is found.
 *
 * @param {Uint8Array} view
 * @returns {{dataOffset:number, dataSize:number}|null}
 *   The offset where Segment data begins and its declared size,
 *   or null if no Segment is found.
 */
function findSegment(view) {
    let offset = skipEbmlHeader(view);

    while (offset < view.length) {
        const id = readElementId(view, offset);
        offset += id.length;

        if (offset >= view.length) return null;

        const sz = readElementSize(view, offset);
        offset += sz.length;

        if (id.value === ELEM.SEGMENT) {
            return { dataOffset: offset, dataSize: sz.value };
        }

        offset += sz.value;
    }

    return null;
}

/**
 * Locate the Tracks element within the Segment data.
 *
 * Scans the byte range defined by `segmentDataOffset` and
 * `segmentDataSize` for an element with the Tracks ID
 * (0x1654AE6B).
 *
 * @param {Uint8Array} view
 * @param {number} segmentDataOffset - Start of Segment element data.
 * @param {number} segmentDataSize - Declared Segment data size.
 * @returns {{dataOffset:number, dataSize:number}|null}
 *   The offset where Tracks data begins and its declared size,
 *   or null if no Tracks element is found.
 */
function findTracks(view, segmentDataOffset, segmentDataSize) {
    const end = segmentDataOffset + segmentDataSize;
    let offset = segmentDataOffset;

    while (offset < end && offset < view.length) {
        const id = readElementId(view, offset);
        offset += id.length;

        if (offset >= view.length) return null;

        const sz = readElementSize(view, offset);
        offset += sz.length;

        if (id.value === ELEM.TRACKS) {
            return { dataOffset: offset, dataSize: sz.value };
        }

        offset += sz.value;
    }

    return null;
}

/**
 * Locate every TrackEntry element within a raw EBML byte buffer.
 *
 * Navigation:
 *
 * ```
 * EBML Header
 *   └── Segment (0x18538067)
 *         └── Tracks (0x1654AE6B)
 *               ├── TrackEntry (0xAE)  ← target
 *               └── TrackEntry (0xAE)  ← target
 * ```
 *
 * Only element IDs and sizes are read — data bodies are not inspected.
 *
 * @param {Uint8Array} view - Buffer containing the EBML header,
 *   Segment, and Tracks elements.
 * @returns {Array<{offset:number, size:number}>} Every TrackEntry
 *   found, or an empty array if none exist.
 * @throws {TypeError} If `view` is not a Uint8Array.
 */
export function findTrackEntries(view) {
    if (!(view instanceof Uint8Array)) {
        throw new TypeError("findTrackEntries: view must be a Uint8Array");
    }

    if (view.length < 4) return [];

    if (view[0] !== 0x1A || view[1] !== 0x45 ||
        view[2] !== 0xDF || view[3] !== 0xA3) {
        return [];
    }

    const entries = [];

    try {
        const segment = findSegment(view);
        if (!segment) return [];

        const tracks = findTracks(view, segment.dataOffset, segment.dataSize);
        if (!tracks) return [];

        // Scan Tracks children for TrackEntry elements
        const tracksEnd = tracks.dataOffset + tracks.dataSize;
        let offset = tracks.dataOffset;

        while (offset < tracksEnd && offset < view.length) {
            const entryOffset = offset;

            const id = readElementId(view, offset);
            offset += id.length;

            if (offset >= view.length) return entries;

            const sz = readElementSize(view, offset);
            offset += sz.length;

            if (id.value === ELEM.TRACK_ENTRY) {
                entries.push({ offset: entryOffset, size: sz.value });
            }

            offset += sz.value;
        }
    } catch (_) {
        // Parsing error mid-scan — return what was found so far
    }

    return entries;
}
