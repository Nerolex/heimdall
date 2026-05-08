import React from 'react';
import type { SunPhase } from './types';
import { CloudCanvas } from './CloudCanvas';
import { RainCanvas } from './RainCanvas';
import { SnowCanvas } from './SnowCanvas';
import { FogCanvas } from './FogCanvas';
import { useLightningFlash } from './LightningFlash';

interface Props {
  conditionId: number;
  sunPhase: SunPhase;
}

/** Decorative celestial/cloud accent element positioned in the upper-right area */
export function WeatherAccent({ conditionId, sunPhase }: Props): React.ReactElement | null {
  const flash = useLightningFlash();

  // Thunderstorm (200-299): dense clouds with lightning + heavy rain
  if (conditionId >= 200 && conditionId < 300) {
    return (
      <>
        <CloudCanvas sunPhase={sunPhase} opacity={0.8} density={0.95} flash={flash} />
        <RainCanvas opacity={0.8} intensity={0.9} />
      </>
    );
  }

  // Rain (500-599) and drizzle (300-399): clouds + rain drops
  if ((conditionId >= 300 && conditionId < 400) || (conditionId >= 500 && conditionId < 600)) {
    const isHeavy = conditionId >= 502 || conditionId === 312 || conditionId === 314;
    return (
      <>
        <CloudCanvas sunPhase={sunPhase} opacity={0.7} density={0.8} />
        <RainCanvas opacity={0.7} intensity={isHeavy ? 0.9 : 0.5} />
      </>
    );
  }

  // Snow (600-699): clouds + snowfall
  if (conditionId >= 600 && conditionId < 700) {
    const isHeavy = conditionId === 602 || conditionId === 622;
    return (
      <>
        <CloudCanvas sunPhase={sunPhase} opacity={0.6} density={0.7} />
        <SnowCanvas opacity={0.9} intensity={isHeavy ? 0.9 : 0.5} />
      </>
    );
  }

  // Fog/mist/haze (700-799): slow-drifting fog banks
  if (conditionId >= 700 && conditionId < 800) {
    return <FogCanvas sunPhase={sunPhase} opacity={0.8} />;
  }

  if (sunPhase === 'night') return <NightAccent conditionId={conditionId} />;
  if (sunPhase === 'golden') return <GoldenAccent conditionId={conditionId} />;
  return <DayAccent conditionId={conditionId} />;
}

/** Daytime accents: bright sun orb for clear, sun + cloud SVGs for partial, cloud bank for overcast */
function DayAccent({ conditionId }: { conditionId: number }): React.ReactElement | null {
  // Clear sky: golden sun orb with warm glow
  if (conditionId === 800) {
    return (
      <div style={{
        position: 'absolute', top: '10%', right: '12%',
        width: '20vw', height: '20vw', borderRadius: '50%',
        background: 'radial-gradient(circle, #fffde6 0%, #fff3a0 25%, #ffd700 50%, rgba(255,215,0,0.15) 75%, transparent 100%)',
        boxShadow: '0 0 120px 60px rgba(255,223,0,0.4)',
      }} />
    );
  }

  // Few/scattered clouds (801-802): sun behind procedural clouds
  if (conditionId >= 801 && conditionId <= 802) {
    const density = conditionId === 801 ? 0.0 : 0.22;
    return (
      <>
        {/* Sun orb behind clouds */}
        <div style={{
          position: 'absolute', top: '10%', right: '12%',
          width: '12vw', height: '12vw', borderRadius: '50%',
          background: 'radial-gradient(circle, #fff8c4 0%, #ffd700 40%, rgba(255,215,0,0.2) 70%, transparent 85%)',
          boxShadow: '0 0 40px 10px rgba(255,215,0,0.2)',
        }} />
        <CloudCanvas sunPhase="day" opacity={0.6} density={density} />
      </>
    );
  }

  // Overcast (803+): full procedural cloud cover, no sun visible
  if (conditionId >= 803) {
    return <CloudCanvas sunPhase="day" opacity={0.8} density={0.9} />;
  }

  return null;
}

/** Golden hour accents: warm orange sun, lower position (closer to horizon) */
function GoldenAccent({ conditionId }: { conditionId: number }): React.ReactElement | null {
  // Clear sunset: large warm sun with very soft, wide halo
  if (conditionId === 800) {
    return (
      <div style={{
        position: 'absolute', top: '30%', right: '8%', // lower than daytime (sun near horizon)
        width: '22vw', height: '22vw', borderRadius: '50%',
        // Multi-stop gradient for ultra-soft edge: bright center → warm → barely visible → gone
        background: 'radial-gradient(circle, #fff8c4 0%, #ffd700 110%, rgba(255,215,0,0.3) 65%, transparent 100%)',
        boxShadow: '0 0 150px 8px yellow,0 0 155px 10px yellow inset', // wide diffuse glow
      }} />
    );
  }

  // Few clouds at sunset: warm sun behind procedural clouds
  if (conditionId >= 801 && conditionId <= 802) {
    const density = conditionId === 801 ? 0.0 : 0.22;
    return (
      <>
        {/* Sun behind clouds — warm orange */}
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '14vw', height: '14vw', borderRadius: '50%',
          background: 'radial-gradient(circle, #ffe8c0 0%, #ff8c00 35%, rgba(255,140,0,0.2) 60%, transparent 80%)',
          boxShadow: '0 0 50px 15px rgba(255,140,0,0.2)',
        }} />
        <CloudCanvas sunPhase="golden" opacity={0.6} density={density} />
      </>
    );
  }

  // Overcast at sunset: dense clouds, no sun visible
  if (conditionId >= 803) {
    return <CloudCanvas sunPhase="golden" opacity={0.8} density={0.9} />;
  }

  return null;
}

/** Night accents: moon for clear, dimmer moon + faint clouds for partial cloud */
function NightAccent({ conditionId }: { conditionId: number }): React.ReactElement | null {
  // Clear night: white moon orb with soft lightblue glow
  if (conditionId === 800) {
    return (
      <div style={{
        position: 'absolute', top: '12%', right: '14%',
        width: '14vw', height: '14vw', borderRadius: '50%',
        backgroundColor: 'white',
        boxShadow: '0px 0px 100px 50px lightblue',
      }} />
    );
  }

  // Partially cloudy night: moon behind procedural clouds
  if (conditionId >= 801 && conditionId <= 802) {
    const density = conditionId === 801 ? 0.0 : 0.22;
    return (
      <>
        {/* Moon behind clouds */}
        <div style={{
          position: 'absolute', top: '12%', right: '14%',
          width: '10vw', height: '10vw', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.7)',
          boxShadow: '0px 0px 60px 30px lightblue',
        }} />
        <CloudCanvas sunPhase="night" opacity={0.5} density={density} />
      </>
    );
  }

  // Overcast night: dense clouds, no moon visible
  if (conditionId >= 803) {
    return <CloudCanvas sunPhase="night" opacity={0.7} density={0.9} />;
  }

  return null;
}
