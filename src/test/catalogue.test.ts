import { describe, expect, it } from 'vitest';
import { services } from '../data/content';
import { filterServices } from '../lib/catalogue';

describe('service filtering', () => {
  it('filters by query and category while hiding inactive records', () => {
    expect(filterServices(services, 'scalp', 'trichology').every((item) => item.category === 'trichology' && item.active)).toBe(true);
    expect(filterServices(services).some((item) => !item.active)).toBe(false);
  });
});
