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
    expect(prompt).toContain('<juro_frontend_craft>');
    expect(prompt).toContain('Design decision');
    expect(prompt).toContain('Then carry out that plan in the SAME user');
  });

  it('exposes the composed managed-workspace profile as a first-class prompt', () => {
    const prompt = PromptLibrary.getPropmtFromLibrary('juro-frontend-craft', {
      cwd: '/home/project',
      allowedHtmlElements: [],
      modificationTagName: 'modifications',
    });

    expect(prompt).toContain('Juro Digital UI Director');
    expect(prompt).toContain("Work from the customer's existing source");
  });
});
