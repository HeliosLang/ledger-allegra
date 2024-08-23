/**
 * @typedef {import("@helios-lang/ledger-shelley").NativeContext} ShelleyNativeContext
 */

/**
 * @typedef {ShelleyNativeContext & {
 *   isAfter: (slot: number) => boolean
 *   isBefore: (slot: number) => boolean
 * }} NativeContext
 */
