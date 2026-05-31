import { useEffect, useState } from 'react';
import type { WeatherSettings } from './types';

const POLL_INTERVAL_MS = 30 * 60 * 1000;

export interface ForecastDay {
  date: Date;
  conditionId: number;
  condition: string;
  tempMin: number;
  tempMax: number;
  sunrise: number;
  sunset: number;
}

export function useForecastData(settings: WeatherSettings) {
  const [days, setDays] = useState<ForecastDay[]>([]);
  const [error, setError] = useState(false);

  const { apiKey, city, units = 'metric', lang = 'de' } = settings;

  useEffect(() => {
    if (!apiKey || !city) { setError(true); return; }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${units}&lang=${lang}&cnt=24&appid=${apiKey}`;
    const currentUrl  = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&lang=${lang}&appid=${apiKey}`;

    function fetchAll(): void {
      Promise.all([fetch(forecastUrl).then(r => r.json()), fetch(currentUrl).then(r => r.json())])
        .then(([forecast, current]) => {
          const sunrise: number = current.sys.sunrise;
          const sunset: number  = current.sys.sunset;

          // Group forecast entries (3-hour slots) by local calendar date
          const byDate = new Map<string, typeof forecast.list>();
          for (const entry of forecast.list) {
            const d = new Date(entry.dt * 1000);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!byDate.has(key)) byDate.set(key, []);
            byDate.get(key)!.push(entry);
          }

          const result: ForecastDay[] = [];
          for (const [, entries] of byDate) {
            if (result.length >= 3) break;

            // Use the noon-closest entry for representative condition
            const noon = entries.reduce((best: typeof entries[0], e: typeof entries[0]) => {
              const h = new Date(e.dt * 1000).getHours();
              const bh = new Date(best.dt * 1000).getHours();
              return Math.abs(h - 12) < Math.abs(bh - 12) ? e : best;
            });

            const tempMin = Math.round(Math.min(...entries.map((e: typeof entries[0]) => e.main.temp_min)));
            const tempMax = Math.round(Math.max(...entries.map((e: typeof entries[0]) => e.main.temp_max)));

            result.push({
              date: new Date(noon.dt * 1000),
              conditionId: noon.weather[0].id,
              condition: noon.weather[0].description,
              tempMin,
              tempMax,
              sunrise,
              sunset,
            });
          }

          setDays(result);
          setError(false);
        })
        .catch(() => setError(true));
    }

    fetchAll();
    const timer = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [apiKey, city, units, lang]);

  return { days, error };
}
