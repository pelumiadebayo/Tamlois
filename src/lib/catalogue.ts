import type { Service } from '../types';

export function filterServices(items: Service[], query = '', category = 'All', includeInactive = false) {
  const needle = query.trim().toLowerCase();
  return items
    .filter((item) => (includeInactive || item.active) && (category === 'All' || item.category === category))
    .filter((item) => `${item.name} ${item.summary} ${item.concerns.join(' ')}`.toLowerCase().includes(needle))
    .sort((a, b) => a.order - b.order);
}
