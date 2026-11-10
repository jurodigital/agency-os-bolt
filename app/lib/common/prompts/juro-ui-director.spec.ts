import { describe, expect, it } from 'vitest';
import { PromptLibrary } from '~/lib/common/prompt-library';

describe('Juro UI Director prompt', () => {
  it('makes the Agency OS design guardrails available as a first-class prompt', () => {
    const prompt = PromptLibrary.getPropmtFromLibrary('juro-ui-director', {
      cwd: '/home/project',
      allowedHtmlElements: [],
      modificationTagName: 'modifications',
    });

    expect(prompt).toContain('You are the Juro Digital UI Director');
    expect(prompt).toContain('anti_generic_defaults');
    expect(prompt).toContain('Read a file before revising it');
    expect(prompt).toContain('prefers-reduced-motion');
  });
});
