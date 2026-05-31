import React from 'react';
import type { WeatherSettings } from './types';
import { useForecastData } from './useForecastData';
import type { ForecastDay } from './useForecastData';
import { getSunPhase } from './sunPhase';
import { getGradient } from './weatherGradients';
import { WeatherAccent } from './WeatherAccent';
import styles from './WeatherForecastView.module.css';

const DAY_LABELS = ['HEUTE', 'MORGEN', 'ÜBERMORGEN'];

const UNIT_SYMBOL: Record<string, string> = {
  imperial: '°F',
  metric: '°C',
};

function DayColumn({ day, label, unitSymbol }: { day: ForecastDay; label: string; unitSymbol: string }): React.ReactElement {
  const sunPhase = getSunPhase(day.sunrise, day.sunset, Math.floor(day.date.getTime() / 1000));
  const gradient = getGradient(day.conditionId, sunPhase);

  return (
    <div className={styles.dayCol} style={{ background: gradient }}>
      <WeatherAccent conditionId={day.conditionId} sunPhase={sunPhase} />
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div className={styles.tempRange}>
          {day.tempMax}{unitSymbol}
          <span className={styles.tempSep}>/</span>
          {day.tempMin}{unitSymbol}
        </div>
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
