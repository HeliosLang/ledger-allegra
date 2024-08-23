/**
 * The Allegra era adds two NativeScript types: after and before.
 * We try to reuse as much functionality from the Shelley era
 */

import {
  decodeInt,
  decodeTagged,
  encodeInt,
  encodeTuple,
} from "@helios-lang/cbor";
import { ByteStream, toInt } from "@helios-lang/codec-utils";
import { blake2b } from "@helios-lang/crypto";
import { NativeScript as ShelleyNativeScript } from "@helios-lang/ledger-shelley";

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/ledger-shelley").NativeContext} ShelleyNativeContext
 * @typedef {import("@helios-lang/ledger-shelley").NativeScriptKind} ShelleyNativeScriptKind
 * @typedef {import("../hashes/index.js").PubKeyHashLike} PubKeyHashLike
 * @typedef {import("./NativeContext.js").NativeContext} NativeContext
 */

/**
 * @template {ShelleyNativeContext} [C=NativeContext]
 * @typedef {import("@helios-lang/ledger-shelley").NativeScriptI<C>} NativeScriptI
 */

/**
 * @typedef {ShelleyNativeScriptKind | "After" | "Before"} NativeScriptKind
 */

/**
 * @template {NativeScriptKind} T
 * @typedef {T extends "After" ? {
 *   slot: number
 * } : T extends "Before" ? {
 *   slot: number
 * } : T extends ShelleyNativeScriptKind ? {
 *   shelleyScript: ShelleyNativeScript<ShelleyNativeScriptKind, NativeContext>
 * } : never} NativeScriptProps
 */

/**
 * @template {NativeScriptKind} [T=NativeScriptKind]
 * @implements {NativeScriptI<NativeContext>}
 */
export class NativeScript {
  /**
   * @private
   * @readonly
   * @type {T}
   */
  kind;

  /**
   * @private
   * @readonly
   * @type {NativeScriptProps<T>}
   */
  props;

  /**
   * @param {T} kind
   * @param {NativeScriptProps<T>} props
   */
  constructor(kind, props) {
    this.kind = kind;
    this.props = props;
  }

  /**
   * @param {PubKeyHashLike} hash
   * @returns {NativeScript<"Sig">}
   */
  static Sig(hash) {
    return new NativeScript("Sig", {
      shelleyScript: ShelleyNativeScript.Sig(hash),
    });
  }

  /**
   * @param {NativeScriptI[]} scripts
   * @returns {NativeScript<"All">}
   */
  static All(scripts) {
    return new NativeScript("All", {
      shelleyScript: ShelleyNativeScript.All(scripts),
    });
  }

  /**
   * @param {NativeScriptI[]} scripts
   * @returns {NativeScript<"Any">}
   */
  static Any(scripts) {
    return new NativeScript("Any", {
      shelleyScript: ShelleyNativeScript.Any(scripts),
    });
  }

  /**
   * @param {IntLike} nRequired
   * @param {NativeScriptI[]} scripts
   * @returns {NativeScript<"AtLeast">}
   */
  static AtLeast(nRequired, scripts) {
    return new NativeScript("AtLeast", {
      shelleyScript: ShelleyNativeScript.AtLeast(nRequired, scripts),
    });
  }

  /**
   * @param {IntLike} slot
   * @returns {NativeScript<"After">}
   */
  static After(slot) {
    return new NativeScript("After", { slot: toInt(slot) });
  }

  /**
   * @param {IntLike} slot
   * @returns {NativeScript<"Before">}
   */
  static Before(slot) {
    return new NativeScript("Before", { slot: toInt(slot) });
  }

  /**
   * Note: everything must be copied
   * @param {ByteArrayLike} bytes
   * @returns {NativeScript}
   */
  static fromCbor(bytes) {
    const stream = ByteStream.from(bytes);
    const streamCopy = stream.copy(); // in case we want to reuse the ShelleyNativeScript.fromCbor method

    if (stream.peekOne() == 0) {
      stream.shiftOne();
    }

    const [tag, decodeItem] = decodeTagged(stream);

    switch (tag) {
      case 4:
        return NativeScript.After(decodeItem(decodeInt));
      case 5:
        return NativeScript.Before(decodeItem(decodeInt));
      default:
        const shelleyScript = ShelleyNativeScript.fromCbor(
          streamCopy,
          NativeScript.fromCbor,
        );
        return new NativeScript(shelleyScript.kind, { shelleyScript });
    }
  }

  /**
   * @param {string | Object} json
   * @returns {NativeScript}
   */
  static fromJson(json) {
    const obj = typeof json == "string" ? JSON.parse(json) : json;

    const type = obj.type;

    if (!type) {
      throw new Error("invalid NativeScript");
    }

    switch (type) {
      case "after": {
        const slot = obj.slot;

        if (typeof slot != "number") {
          throw new Error("invalid NativeAfter script");
        }

        return NativeScript.After(slot);
      }
      case "before": {
        const slot = obj.slot;

        if (typeof slot != "number") {
          throw new Error("invalid NativeAfter script");
        }

        return NativeScript.Before(slot);
      }
      default:
        const shelleyScript = ShelleyNativeScript.fromJson(
          obj,
          NativeScript.fromJson,
        );
        return new NativeScript(shelleyScript.kind, { shelleyScript });
    }
  }

  /**
   * @param {NativeContext} ctx
   * @returns {boolean}
   */
  eval(ctx) {
    if (this.isShelley()) {
      return this.props.shelleyScript.eval(ctx);
    } else if (this.isAfter()) {
      return ctx.isAfter(this.props.slot);
    } else if (this.isBefore()) {
      return ctx.isBefore(this.props.slot);
    } else {
      throw new Error(`unhandled NativeScript kind ${this.kind}`);
    }
  }

  /**
   * Calculates the blake2b-224 (28 bytes) hash of the NativeScript.
   *
   * **Note**: before calculating the hash a 0 byte is prepended to the CBOR bytes
   *
   * @returns {number[]}
   */
  hash() {
    const bytes = this.toCbor();
    bytes.unshift(0);
    return blake2b(bytes, 28);
  }

  /**
   * @returns {this is NativeScript<"Sig">}
   */
  isSig() {
    return this.kind == "Sig";
  }

  /**
   * @returns {this is NativeScript<"All">}
   */
  isAll() {
    return this.kind == "All";
  }

  /**
   * @returns {this is NativeScript<"Any">}
   */
  isAny() {
    return this.kind == "Any";
  }

  /**
   * @returns {this is NativeScript<"AtLeast">}
   */
  isAtLeast() {
    return this.kind == "AtLeast";
  }

  /**
   * @returns {this is NativeScript<ShelleyNativeScriptKind>}
   */
  isShelley() {
    return this.isSig() || this.isAll() || this.isAny() || this.isAtLeast();
  }

  /**
   * @returns {this is NativeScript<"After">}
   */
  isAfter() {
    return this.kind == "After";
  }

  /**
   * @returns {this is NativeScript<"Before">}
   */
  isBefore() {
    return this.kind == "Before";
  }

  /**
   * @returns {number[]}
   */
  toCbor() {
    if (this.isShelley()) {
      return this.props.shelleyScript.toCbor();
    } else if (this.isAfter()) {
      return encodeTuple([encodeInt(4), encodeInt(this.props.slot)]);
    } else if (this.isBefore()) {
      return encodeTuple([encodeInt(5), encodeInt(this.props.slot)]);
    } else {
      throw new Error(`unhandled NativeScript kind ${this.kind}`);
    }
  }

  /**
   * @returns {Object}
   */
  toJson() {
    if (this.isShelley()) {
      return this.props.shelleyScript.toJson();
    } else if (this.isAfter()) {
      const slot = this.props.slot;

      return {
        type: "after",
        slot,
      };
    } else if (this.isBefore()) {
      const slot = this.props.slot;

      return {
        type: "before",
        slot,
      };
    } else {
      throw new Error(`unhandled NativeScript kind ${this.kind}`);
    }
  }
}
