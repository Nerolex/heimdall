import React, { useEffect, useState } from 'react';
import type { WeatherConfig } from '@heimdall/shared';

interface WeatherData {
  temp: number;
  description: string;
  iconCode: string;
}

interface WeatherProps {
  config: WeatherConfig;
}

const DEFAULT_REFRESH_MINUTES = 15;
const ICON_SIZE = '3vw';

/** Map OWM icon codes to white SVG weather icons */
function WeatherIcon({ code }: { code: string }): React.ReactElement {
  const style = { width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 };
  const base = code.replace(/[dn]$/, '');

  switch (base) {
    // Clear sky — sun
    case '01':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    // Few clouds — sun + cloud
    case '02':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <circle cx="10" cy="7" r="3.5" />
          <line x1="10" y1="1.5" x2="10" y2="2.5" />
          <line x1="5" y1="4" x2="5.7" y2="4.7" />
          <line x1="15" y1="4" x2="14.3" y2="4.7" />
          <line x1="4" y1="7" x2="5" y2="7" />
          <path d="M8 14.5H6.5a4 4 0 1 1 .5-7.97h.17A4 4 0 0 1 15 9a3.5 3.5 0 0 1 3.5 3.5 2.5 2.5 0 0 1-2.5 2.5H8z" fill="none" />
        </svg>
      );
    // Scattered / broken / overcast clouds
    case '03':
    case '04':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    // Rain (shower + regular)
    case '09':
    case '10':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <line x1="8" y1="19" x2="8" y2="22" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="16" y1="19" x2="16" y2="22" />
        </svg>
      );
    // Thunderstorm
    case '11':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <polyline points="13 16 11 20 15 20 13 24" />
        </svg>
      );
    // Snow
    case '13':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <line x1="8" y1="20" x2="8" y2="20.01" />
          <line x1="12" y1="20" x2="12" y2="20.01" />
          <line x1="16" y1="20" x2="16" y2="20.01" />
        </svg>
      );
    // Mist / fog / haze
    case '50':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={style}>
          <line x1="3" y1="8" x2="21" y2="8" />
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="3" y1="16" x2="21" y2="16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
  }
}

/** Displays current weather from OpenWeatherMap */
export function Weather({ config }: WeatherProps): React.ReactElement {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const units = config.units || 'metric';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.city)}&units=${units}&appid=${config.apiKey}`;

    function fetchWeather(): void {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            iconCode: data.weather[0].icon,
          });
          setError(false);
        })
        .catch(() => setError(true));
    }

    fetchWeather();
    const refreshMs = (config.refreshInterval || DEFAULT_REFRESH_MINUTES) * 60 * 1000;
    const timer = setInterval(fetchWeather, refreshMs);
    return () => clearInterval(timer);
  }, [config.apiKey, config.city, config.units, config.refreshInterval]);

  if (error) {
    return <span data-testid="overlay-weather" style={{ fontSize: '2vw', opacity: 0.6 }}>--</span>;
  }

  if (!weather) {
    return <span data-testid="overlay-weather" style={{ fontSize: '2vw', opacity: 0.6 }}>…</span>;
  }

  const unit = config.units === 'imperial' ? '°F' : '°C';

  return (
    <span
      data-testid="overlay-weather"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5vw', fontSize: '2vw' }}
    >
      <WeatherIcon code={weather.iconCode} />
      {weather.temp}{unit}
    </span>
  );
}
