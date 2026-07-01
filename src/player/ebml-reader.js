/**
 * @module ebml-reader
 * @description Low-level EBML variable-length integer (VInt) decoding.
 * Provides primitive readers for element IDs, sizes, and generic VInts.
 * No container-aware parsing or codec detection is performed here.
 */

/**
 * Determine the VInt byte-length encoded in the first byte.
 * The position of the first 1-bit (from the MSB) gives the length.
 *
 * @param {number} byte - The first byte of the VInt.
 * @returns {number} Length in bytes (1–8), or 0 if the byte is 0x00.
 */
function vintLength(byte) {
    if (byte === 0) return 0;

    let len = 1;
    let mask = 0x80;

    while ((byte & mask) === 0) {
        len++;
        mask >>= 1;
        if (len > 8) return 0;
    }

    return len;
}

/**
 * Validate a Uint8Array view and a numerical offset.
 *
 * @param {Uint8Array} view
 * @param {unknown} offset
 * @param {string} fnName
 * @returns {void}
 * @throws {TypeError}
 */
function validate(view, offset, fnName) {
    if (!(view instanceof Uint8Array)) {
        throw new TypeError(`${fnName}: view must be a Uint8Array`);
    }

    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
        throw new TypeError(`${fnName}: offset must be a non-negative integer`);
    }

    if (offset >= view.length) {
        throw new TypeError(`${fnName}: offset out of bounds`);
    }
}

/**
 * Read a generic EBML variable-length integer (VInt).
 *
 * The first byte determines the length (position of the MSB 1-bit).
 * The value is formed by removing the leading 1-bit (and any implicit
 * leading zeros) and combining the remaining bits with the following
 * bytes.
 *
 * @param {Uint8Array} view - The byte buffer to read from.
 * @param {number} offset - Byte offset within the view.
 * @returns {{value:number, length:number}} Decoded value and the
 *   number of bytes consumed.
 * @throws {TypeError} If `view` is not a Uint8Array, `offset` is
 *   invalid, or the VInt cannot be decoded.
 */
export function readVint(view, offset) {
    validate(view, offset, "readVint");

    const firstByte = view[offset];
    const len = vintLength(firstByte);

    if (len === 0) {
        throw new TypeError("readVint: invalid VInt (first byte is 0x00)");
    }

    if (offset + len > view.length) {
        throw new TypeError("readVint: insufficient data for VInt");
    }

    // Mask removes the leading 1-bit and any implicit zeros before it
    const mask  = 0xFF >> len;
    let value   = firstByte & mask;

    for (let i = 1; i < len; i++) {
        value = (value << 8) | view[offset + i];
    }

    return { value, length: len };
}

/**
 * Read an EBML element ID.
 *
 * Element IDs use the same VInt length encoding as standard VInts,
 * but the value **includes** the leading marker bit (i.e. the raw
 * bytes are combined without masking the first byte).
 *
 * @param {Uint8Array} view - The byte buffer to read from.
 * @param {number} offset - Byte offset within the view.
 * @returns {{value:number, length:number}} Decoded element ID and
 *   the number of bytes consumed.
 * @throws {TypeError} If `view` is not a Uint8Array, `offset` is
 *   invalid, or the element ID cannot be decoded.
 */
export function readElementId(view, offset) {
    validate(view, offset, "readElementId");

    const firstByte = view[offset];
    const len = vintLength(firstByte);

    if (len === 0) {
        throw new TypeError("readElementId: invalid element ID (first byte is 0x00)");
    }

    if (offset + len > view.length) {
        throw new TypeError("readElementId: insufficient data for element ID");
    }

    let value = 0;

    for (let i = 0; i < len; i++) {
        value = (value << 8) | view[offset + i];
    }

    return { value, length: len };
}

/**
 * Read an EBML element data size.
 *
 * Element sizes are encoded as standard VInts identical to
 * {@link readVint}. The value excludes the leading marker bit.
 *
 * @param {Uint8Array} view - The byte buffer to read from.
 * @param {number} offset - Byte offset within the view.
 * @returns {{value:number, length:number}} Decoded data size and
 *   the number of bytes consumed.
 * @throws {TypeError} If `view` is not a Uint8Array, `offset` is
 *   invalid, or the size cannot be decoded.
 */
export function readElementSize(view, offset) {
    validate(view, offset, "readElementSize");

    const firstByte = view[offset];
    const len = vintLength(firstByte);

    if (len === 0) {
        throw new TypeError("readElementSize: invalid element size (first byte is 0x00)");
    }

    if (offset + len > view.length) {
        throw new TypeError("readElementSize: insufficient data for element size");
    }

    const mask  = 0xFF >> len;
    let value   = firstByte & mask;

    for (let i = 1; i < len; i++) {
        value = (value << 8) | view[offset + i];
    }

    return { value, length: len };
}
