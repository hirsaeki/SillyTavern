import { describe, test, expect } from '@jest/globals';

import { resolveContinuePrefill } from '../public/scripts/extensions/connection-prefill-override/policy.js';

describe('connection prefill override policy', () => {
    test('keeps the user baseline when no override is set', () => {
        expect(resolveContinuePrefill(false, true)).toBe(true);
        expect(resolveContinuePrefill(false, false)).toBe(false);
    });

    test('disables Continue Prefill when no-prefill override is set', () => {
        expect(resolveContinuePrefill(true, true)).toBe(false);
        expect(resolveContinuePrefill(true, false)).toBe(false);
    });
});
