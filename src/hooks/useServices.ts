import { useEffect, useState } from 'react';
import { services as seedServices } from '../data/content';
import { firebaseEnabled } from '../lib/firebase';
import { listPublicServices } from '../repositories/publicServices';
import type { Service } from '../types';

export function useServices() {
  const [services, setServices] = useState<Service[]>(
    [...seedServices].sort((a, b) => a.order - b.order),
  );
  const [loading, setLoading] = useState(firebaseEnabled);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listPublicServices()
      .then((items) => {
        if (!active) return;
        const catalog = items.length ? items : seedServices;
        const hydrated = catalog
          .filter((service) => service.id !== "svc-salon-demo")
          .map((service) => {
            if (firebaseEnabled) return service;
            const seed = seedServices.find((item) => item.id === service.id);
            return seed
              ? {
                  ...service,
                  name: seed.name,
                  slug: seed.slug,
                  category: seed.category,
                  order: seed.order,
                  active: seed.active,
                }
              : service;
          });
        setServices(hydrated.sort((a, b) => a.order - b.order));
      })
      .catch(() => { if (active) setError('The live service catalogue could not be loaded. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { services, loading, error };
}
