import { useEffect, useRef, useState } from 'react';
import { fetchStats } from '../services/api';


export default function useLiveStats(interval = 8000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer = null;

    async function load() {
      setLoading(true);
      try {
        const json = await fetchStats();
        if (!mounted.current) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (!mounted.current) return;
        setError(e);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    load();
    timer = setInterval(load, interval);

    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [interval]);

  return { data, loading, error };
}
