import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS, MEDIATION_WARNING, REPORT_TAXONOMY, getCategoryTaxonomy } from './reportTaxonomy';

describe('report taxonomy', () => {
  it('matches required incident categories for the reporting flow', () => {
    expect(CATEGORY_OPTIONS).toEqual(['Fire', 'Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other']);
  });

  it('ensures every category has at least one configured subcategory', () => {
    for (const item of REPORT_TAXONOMY) {
      expect(item.subcategories.length).toBeGreaterThan(0);
    }
  });

  it('returns category metadata and mediation flag as expected', () => {
    const category = getCategoryTaxonomy('Noise');
    expect(category).not.toBeNull();
    expect(category?.requiresMediation).toBe(false);
    expect(typeof MEDIATION_WARNING).toBe('string');
    expect(MEDIATION_WARNING.length).toBeGreaterThan(20);
  });
});
