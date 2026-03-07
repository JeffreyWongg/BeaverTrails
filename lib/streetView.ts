import { Stop } from '../types';

let mapsLoadPromise: Promise<void> | null = null;

async function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.maps?.StreetViewService) return;

  if (!mapsLoadPromise) {
    mapsLoadPromise = (async () => {
      const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader');
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '' });
      await importLibrary('maps');
    })();
  }

  return mapsLoadPromise;
}

export function getStopKey(stop: Stop): string {
  return (
    stop.id ||
    `${stop.name}_${stop.coordinates[0].toFixed(4)}_${stop.coordinates[1].toFixed(4)}`
  );
}

export async function checkStreetViewCoverage(
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    await loadGoogleMaps();
    return new Promise<boolean>((resolve) => {
      const sv = new google.maps.StreetViewService();
      sv.getPanorama({ location: { lat, lng }, radius: 100 }, (_data, status) => {
        resolve(status === google.maps.StreetViewStatus.OK);
      });
    });
  } catch {
    return false;
  }
}
