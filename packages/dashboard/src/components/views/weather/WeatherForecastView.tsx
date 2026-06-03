import React from 'react';
import type { WeatherSettings } from './types';
import { useForecastData } from './useForecastData';
import type { ForecastDay } from './useForecastData';
import { getSunPhase } from './sunPhase';
import type { SunPhase } from './types';
import { getGradient } from './weatherGradients';
import { WeatherAccent } from './WeatherAccent';
import styles from './WeatherForecastView.module.css';

const DAY_LABELS = ['HEUTE', 'MORGEN', 'ÜBERMORGEN'];

const UNIT_SYMBOL: Record<string, string> = {
  imperial: '°F',
  metric: '°C',
};

function conditionGlyph(conditionId: number, sunPhase: SunPhase): string {
  if (conditionId >= 200 && conditionId < 300) return '⛈️';
  if (conditionId >= 300 && conditionId < 400) return '🌦️';
  if (conditionId >= 500 && conditionId < 600) return '🌧️';
  if (conditionId >= 600 && conditionId < 700) return '🌨️';
  if (conditionId >= 700 && conditionId < 800) return '🌫️';
  if (conditionId === 800) {
    if (sunPhase === 'night') return '🌙';
    if (sunPhase === 'golden') return '🌅';
    return '☀️';
  }
  if (conditionId >= 801 && conditionId <= 802) {
    return sunPhase === 'night' ? '☁️' : '🌤️';
  }
  // overcast (803+) or unknown
  return '☁️';
}

function DayColumn({ day, label, unitSymbol }: { day: ForecastDay; label: string; unitSymbol: string }): React.ReactElement {
  // Use noon of the forecast day as the reference time.
  // Shift today's sunrise/sunset by the day offset so future days compare correctly.
  const noonForDay = new Date(day.date);
  noonForDay.setHours(12, 0, 0, 0);
  const noonUnix = Math.floor(noonForDay.getTime() / 1000);
  const dayOffsetSec = Math.round((noonUnix - Date.now() / 1000) / 86400) * 86400;
  const sunPhase = getSunPhase(day.sunrise + dayOffsetSec, day.sunset + dayOffsetSec, noonUnix);
  const gradient = getGradient(day.conditionId, sunPhase);

  return (
    <div className={styles.dayCol} style={{ background: gradient }}>
      <WeatherAccent conditionId={day.conditionId} sunPhase={sunPhase} />
      <div className={styles.content}>
        <div className={styles.glyph}>{conditionGlyph(day.conditionId, sunPhase)}</div>
        <div className={styles.label}>{label}</div>
        <div className={styles.tempHigh}>H {day.tempMax}{unitSymbol}</div>
        <div className={styles.tempLow}>L {day.tempMin}{unitSymbol}</div>
        <div className={styles.condition}>{day.condition}</div>
      </div>
    </div>
  );
}

export function WeatherForecastView({ settings }: { settings: Record<string, unknown> }): React.ReactElement {
  const weatherSettings = settings as WeatherSettings;
  const { days, error } = useForecastData(weatherSettings);

  if (error || days.length === 0) {
    return (
      <div className={styles.loading}>
        {error ? 'Vorhersage nicht verfügbar' : 'Lade…'}
      </div>
    );
  }

  const unitSymbol = UNIT_SYMBOL[weatherSettings.units ?? 'metric'] ?? '°C';

  return (
    <div className={styles.container}>
      {days.slice(0, 3).map((day, i) => (
        <DayColumn
          key={i}
          day={day}
          label={DAY_LABELS[i] ?? `+${i}`}
          unitSymbol={unitSymbol}
        />
      ))}
    </div>
  );
}
