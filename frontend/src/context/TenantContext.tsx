import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/client';

interface TenantInfo {
  slug: string;
  name: string;
  logoUrl: string | null;
  loading: boolean;
  notFound: boolean;
}

const TenantContext = createContext<TenantInfo | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { venueSlug = '' } = useParams();
  const [info, setInfo] = useState<TenantInfo>({ slug: venueSlug, name: '', logoUrl: null, loading: true, notFound: false });

  useEffect(() => {
    setInfo({ slug: venueSlug, name: '', logoUrl: null, loading: true, notFound: false });
    get<{ slug: string; name: string; logoUrl: string | null }>(`/tenants/${venueSlug}/branding`)
      .then((d) => {
        setInfo({ slug: venueSlug, name: d.name, logoUrl: d.logoUrl, loading: false, notFound: false });
        document.title = `${d.name} — Gratify`;
      })
      .catch(() => {
        setInfo({ slug: venueSlug, name: '', logoUrl: null, loading: false, notFound: true });
        document.title = 'Gratify';
      });
  }, [venueSlug]);

  return <TenantContext.Provider value={info}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
