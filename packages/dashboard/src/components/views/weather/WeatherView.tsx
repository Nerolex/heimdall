import React from 'react';
import { useWeatherData } from './useWeatherData';
import { getSunPhase, getSimParams } from './sunPhase';
import { getGradient } from './weatherGradients';
import { WeatherAccent } from './WeatherAccent';
import styles from './WeatherView.module.css';

interface WeatherViewProps {
  settings: Record<string, unknown>;
}

export function WeatherView({ settings }: WeatherViewProps): React.ReactElement {
  const { data, error } = useWeatherData({
    apiKey: settings.apiKey as string | undefined,
    city: settings.city as string | undefined,
    units: (settings.units as string) || 'metric',
    lang: (settings.lang as string) || 'de',
  });

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
  const unitSymbol = (settings.units === 'imperial') ? '°F' : '°C';
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
