import { decodeBytes, encodeBytes } from "@helios-lang/cbor";
import {
  bytesToHex,
  compareBytes,
  equalsBytes,
  toBytes,
} from "@helios-lang/codec-utils";
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc";

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @typedef {ScriptHash | ByteArrayLike} ScriptHashLike
 */

/**
 * @implements {Hash}
 */
export class ScriptHash {
  /**
   * @readonly
   * @type {number[]}
   */
  bytes;

  /**
   *
   * @param {Exclude<ScriptHashLike, ScriptHash>} arg
   */
  constructor(arg) {
    this.bytes = toBytes(arg);
  }

  /**
   * @param {ScriptHashLike} arg
   * @returns {ScriptHash}
   */
  static new(arg) {
    return arg instanceof ScriptHash ? arg : new ScriptHash(arg);
  }

  /**
   * @param {ByteArrayLike} bytes
   * @returns {ScriptHash}
   */
  static fromCbor(bytes) {
    return new ScriptHash(decodeBytes(bytes));
  }

  /**
   * @param {UplcData} data
   * @returns {ScriptHash}
   */
  static fromUplcData(data) {
    return new ScriptHash(ByteArrayData.expect(data).bytes);
  }

  /**
   * @param {ByteArrayLike} bytes
   * @returns {ScriptHash}
   */
  static fromUplcCbor(bytes) {
    return ScriptHash.fromUplcData(decodeUplcData(bytes));
  }

  /**
   * @param {ScriptHash} a
   * @param {ScriptHash} b
   * @returns {number}
   */
  static compare(a, b) {
    return compareBytes(a.bytes, b.bytes);
  }

  /**
   * @param {ScriptHash} other
   * @returns {boolean}
   */
  isEqual(other) {
    return equalsBytes(this.bytes, other.bytes);
  }

  /**
   * @returns {number[]}
   */
  toCbor() {
    return encodeBytes(this.bytes);
  }

  /**
   * @returns {string}
   */
  toHex() {
    return bytesToHex(this.bytes);
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.toHex();
  }

  /**
   * @returns {ByteArrayData}
   */
  toUplcData() {
    return new ByteArrayData(this.bytes);
  }
}
