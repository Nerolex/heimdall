import React, { useEffect, useState } from 'react';
import type { ComponentProps, WeatherConfig } from '@heimdall/shared';
import styles from './Clock.module.css';

interface WeatherData {
  temp: number;
  iconCode: string;
}

const WEEKDAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

function WeatherIcon({ code }: { code: string }): React.ReactElement {
  const style = { width: '1em', height: '1em', flexShrink: 0 } as const;
  const base = code.replace(/[dn]$/, '');

  switch (base) {
    case '01':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case '02':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <circle cx="10" cy="7" r="3.5" /><line x1="10" y1="1.5" x2="10" y2="2.5" />
          <line x1="5" y1="4" x2="5.7" y2="4.7" /><line x1="15" y1="4" x2="14.3" y2="4.7" /><line x1="4" y1="7" x2="5" y2="7" />
          <path d="M8 14.5H6.5a4 4 0 1 1 .5-7.97h.17A4 4 0 0 1 15 9a3.5 3.5 0 0 1 3.5 3.5 2.5 2.5 0 0 1-2.5 2.5H8z" fill="none" />
        </svg>
      );
    case '03': case '04':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    case '09': case '10':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <line x1="8" y1="19" x2="8" y2="22" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="16" y1="19" x2="16" y2="22" />
        </svg>
      );
    case '11':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <polyline points="13 16 11 20 15 20 13 24" />
        </svg>
      );
    case '13':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <line x1="8" y1="20" x2="8" y2="20.01" /><line x1="12" y1="20" x2="12" y2="20.01" /><line x1="16" y1="20" x2="16" y2="20.01" />
        </svg>
      );
    case '50':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={style}>
          <line x1="3" y1="8" x2="21" y2="8" /><line x1="5" y1="12" x2="19" y2="12" /><line x1="3" y1="16" x2="21" y2="16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
  }
}

function formatDate(now: Date): string {
  const weekday = WEEKDAYS[now.getDay()];
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  return `${weekday}., ${day}. ${month}`;
}

function formatTime(now: Date): string {
  return now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function ClockView({ settings }: ComponentProps): React.ReactElement {
  const [time, setTime] = useState(new Date());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const weatherConfig = settings as unknown as WeatherConfig | undefined;
  const apiKey = (settings.weatherApiKey as string) || weatherConfig?.apiKey;
  const city = (settings.weatherCity as string) || weatherConfig?.city;
  const units = (settings.weatherUnits as string) || weatherConfig?.units || 'metric';

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch random photo on mount
  useEffect(() => {
    fetch('/api/photos/random?count=1')
      .then(res => res.json())
      .then(data => {
        const photo = data.photo || data.photos?.[0];
        if (photo) {
          setPhotoUrl(`/api/photos/file/${photo.id}`);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch weather
  useEffect(() => {
    if (!apiKey || !city) return;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;

    function fetchWeather(): void {
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setWeather({ temp: Math.round(data.main.temp), iconCode: data.weather[0].icon });
        })
        .catch(() => {});
    }

    fetchWeather();
    const timer = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [apiKey, city, units]);

  const unit = units === 'imperial' ? '°F' : '°C';

  return (
    <div className={styles.container}>
      {/* Photo background — blurred fill + sharp contain */}
      {photoUrl && <img src={photoUrl} className={styles.bgBlurred} alt="" />}
      {photoUrl && <img src={photoUrl} className={styles.bgPhoto} alt="" />}
      <div className={styles.overlay} />

      {/* Bottom content */}
      <div className={styles.content}>
        {/* Info bar: weather | date */}
        <div className={styles.infoBar}>
          {weather && (
            <span className={styles.weatherInfo}>
              <WeatherIcon code={weather.iconCode} />
              <span>{weather.temp}{unit}</span>
            </span>
          )}
          {weather && <span className={styles.separator} />}
          <span className={styles.dateInfo}>{formatDate(time)}</span>
        </div>

        {/* Large clock */}
        <div className={styles.clock}>{formatTime(time)}</div>
      </div>
    </div>
  );
}
