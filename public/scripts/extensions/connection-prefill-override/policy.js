export const NO_PREFILL_OVERRIDE = Object.freeze({
    AUTO: false,
    DISABLED: true,
});

/**
 * Resolves whether Continue Prefill should be enabled for a profile.
 * @param {boolean} noPrefill Whether the profile explicitly disables prefill.
 * @param {boolean} baseline User's normal Continue Prefill setting.
 * @returns {boolean} Effective Continue Prefill setting.
 */
export function resolveContinuePrefill(noPrefill, baseline) {
    return noPrefill ? false : Boolean(baseline);
}
