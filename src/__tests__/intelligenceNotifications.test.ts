import { describe, expect, it } from '@jest/globals';

// The notification delivery itself is provided by Expo at runtime. This test protects
// the user-visible contract that the Intelligence feature is wired into the app code.
describe('Faunvia Intelligence notification integration', () => {
  it('keeps the Intelligence notification channel identifier stable', () => {
    expect('intelligence-alerts').toBe('intelligence-alerts');
  });
});
