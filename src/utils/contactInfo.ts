import { useEffect, useState } from 'react';
import { ContactInfo } from '../types';
import { fetchContactInfo } from './api';
import { DEFAULT_CONTACT_INFO } from './contactInfoDefaults';

export const CONTACT_INFO_UPDATED_EVENT = 'school-contact-info-updated';
export { DEFAULT_CONTACT_INFO };

export function useContactInfo(): ContactInfo {
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);

  useEffect(() => {
    let isActive = true;
    const refresh = async () => {
      try {
        const updated = await fetchContactInfo();
        if (isActive) setContactInfo(updated);
      } catch (error) {
        console.error('Gagal memuat informasi kontak sekolah:', error);
      }
    };

    void refresh();
    window.addEventListener(CONTACT_INFO_UPDATED_EVENT, refresh);
    return () => {
      isActive = false;
      window.removeEventListener(CONTACT_INFO_UPDATED_EVENT, refresh);
    };
  }, []);

  return contactInfo;
}
