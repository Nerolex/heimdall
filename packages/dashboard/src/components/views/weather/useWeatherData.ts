import { useEffect, useState } from 'react';
import type { WeatherData, WeatherSettings } from './types';

const POLL_INTERVAL_MS = 10 * 60 * 1000;

export function useWeatherData(settings: WeatherSettings) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  const { apiKey, city, units = 'metric', lang = 'de' } = settings;

  useEffect(() => {
    if (!apiKey || !city) {
      setError(true);
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&lang=${lang}&appid=${apiKey}`;

    function fetchWeather(): void {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((raw) => {
          setData({
            temp: Math.round(raw.main.temp),
            tempMin: Math.round(raw.main.temp_min),
            tempMax: Math.round(raw.main.temp_max),
            condition: raw.weather[0].description,
            conditionId: raw.weather[0].id,
            city: raw.name,
            sunrise: raw.sys.sunrise,
            sunset: raw.sys.sunset,
          });
          setError(false);
        })
        .catch(() => setError(true));
    }

    fetchWeather();
    const timer = setInterval(fetchWeather, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [apiKey, city, units, lang]);

  return { data, error };
}
