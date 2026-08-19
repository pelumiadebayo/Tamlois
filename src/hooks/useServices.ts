import { useEffect, useState } from 'react';
import { services as seedServices } from '../data/content';
import { firebaseEnabled } from '../lib/firebase';
import { listPublicServices } from '../repositories/publicServices';
import type { Service } from '../types';

export function useServices() {
  const [services, setServices] = useState<Service[]>(seedServices);
  const [loading, setLoading] = useState(firebaseEnabled);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listPublicServices()
      .then((items) => { if (active) setServices(items.sort((a, b) => a.order - b.order)); })
      .catch(() => { if (active) setError('The live service catalogue could not be loaded. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { services, loading, error };
}
