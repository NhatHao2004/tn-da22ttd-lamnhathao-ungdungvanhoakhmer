import { useEffect, useState } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    // Simulate getting location
    setTimeout(() => {
      setLocation({
        coords: {
          latitude: 9.7161, // Tra Vinh area
          longitude: 106.3533,
        }
      });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { location, loading, error, refresh };
};
