import { useEffect, useState } from 'react';
import { services as seedServices } from '../data/content';
import { firebaseEnabled, firebaseMode } from '../lib/firebase';
import { listPublicServices } from '../repositories/publicServices';
import type { Service } from '../types';

export function useServices() {
  const [services, setServices] = useState<Service[]>(
    firebaseMode ? [] : [...seedServices].sort((a, b) => a.order - b.order),
  );
  const [loading, setLoading] = useState(firebaseMode);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    listPublicServices()
      .then((items) => {
        if (!active) return;
        const catalog = firebaseMode ? items : items.length ? items : seedServices;
        const hydrated = catalog
          .filter((service) => service.id !== "svc-salon-demo")
          .map((service) => {
            if (firebaseMode) return service;
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
  }, [request]);

  const retry = () => {
    setError('');
    setLoading(true);
    setRequest((current) => current + 1);
  };

  return { services, loading, error, retry };
}
