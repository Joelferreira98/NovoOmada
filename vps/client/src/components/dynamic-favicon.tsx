import { useEffect } from 'react';
import { useAppSettings } from '@/hooks/use-app-settings';

export function DynamicFavicon() {
  const { data: appSettings } = useAppSettings();

  useEffect(() => {
    if (appSettings?.faviconUrl) {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach(link => link.remove());

      // Add new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = appSettings.faviconUrl;
      document.head.appendChild(link);

      // Also update apple-touch-icon if it's an image
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = appSettings.faviconUrl;
      document.head.appendChild(appleLink);
    }
  }, [appSettings?.faviconUrl]);

  useEffect(() => {
    if (appSettings?.appName) {
      document.title = appSettings.appName;
    }
  }, [appSettings?.appName]);

  return null; // This component doesn't render anything
}