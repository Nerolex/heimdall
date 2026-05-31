import React from 'react';
import type { WeatherSettings } from './types';
import { useWeatherData } from './useWeatherData';
import { getSunPhase, getSimParams } from './sunPhase';
import { getGradient } from './weatherGradients';
import { WeatherAccent } from './WeatherAccent';
import styles from './WeatherView.module.css';

export function WeatherView({ settings }: { settings: Record<string, unknown> }): React.ReactElement {
  const weatherSettings = settings as WeatherSettings;
  const { data, error } = useWeatherData(weatherSettings);

  if (error || !data) {
    return (
      <div className={styles.loading} data-testid="weather-view">
        {error ? 'Weather unavailable' : 'Loading…'}
      </div>
    );
  }

  const sim = getSimParams();
  const conditionId = sim.conditionId ?? data.conditionId;
  const sunPhase = sim.sunPhase ?? getSunPhase(data.sunrise, data.sunset);
  const condition = sim.conditionText ?? data.condition;
  const unitSymbol = weatherSettings.units === 'imperial' ? '°F' : '°C';
  const gradient = getGradient(conditionId, sunPhase);

  return (
    <div
      className={styles.container}
      data-testid="weather-view"
      style={{ background: gradient }}
    >
      <WeatherAccent conditionId={conditionId} sunPhase={sunPhase} />
      <div className={styles.content}>
        <div className={styles.temperature}>{data.temp}{unitSymbol}</div>
        <div className={styles.condition}>{condition}</div>
        <div className={styles.city}>{data.city}</div>
        <div className={styles.hiLo}>H: {data.tempMax}{unitSymbol}  L: {data.tempMin}{unitSymbol}</div>
      </div>
    </div>
  );
}
