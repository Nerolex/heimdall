import type { SunPhase } from './types';

/** Window in seconds around sunrise/sunset that counts as "golden hour" */
const GOLDEN_WINDOW_SECONDS = 45 * 60; // 45 minutes

/**
 * Determine sun phase from current time vs sunrise/sunset timestamps.
 * - 'golden': within ±45min of sunrise or sunset
 * - 'day': between sunrise+45min and sunset-45min
 * - 'night': everything else (before sunrise or after sunset)
 */
export function getSunPhase(sunrise: number, sunset: number, nowUnix?: number): SunPhase {
  const now = nowUnix ?? Math.floor(Date.now() / 1000);

  if (now >= sunrise - GOLDEN_WINDOW_SECONDS && now <= sunrise + GOLDEN_WINDOW_SECONDS) return 'golden';
  if (now >= sunset - GOLDEN_WINDOW_SECONDS && now <= sunset + GOLDEN_WINDOW_SECONDS) return 'golden';
  if (now > sunrise + GOLDEN_WINDOW_SECONDS && now < sunset - GOLDEN_WINDOW_SECONDS) return 'day';
  return 'night';
}

/** Read simulation params from URL: ?simCondition=800&simSunPhase=night */
export function getSimParams(): { conditionId?: number; sunPhase?: SunPhase; conditionText?: string } {
  const params = new URLSearchParams(window.location.search);
  const cond = params.get('simCondition');
  const phase = params.get('simSunPhase');
  const conditionId = cond ? parseInt(cond, 10) : undefined;
  return {
    conditionId,
    sunPhase: (phase === 'day' || phase === 'golden' || phase === 'night') ? phase : undefined,
    conditionText: conditionId ? getConditionText(conditionId) : undefined,
  };
}

/** German condition labels for simulation (matching OWM responses) */
function getConditionText(id: number): string {
  if (id === 800) return 'Klarer Himmel';
  if (id === 801) return 'Ein paar Wolken';
  if (id === 802) return 'Mäßig bewölkt';
  if (id === 803) return 'Überwiegend bewölkt';
  if (id === 804) return 'Bedeckt';
  if (id >= 500 && id < 600) return 'Regen';
  if (id >= 300 && id < 400) return 'Nieselregen';
  if (id >= 200 && id < 300) return 'Gewitter';
  if (id >= 600 && id < 700) return 'Schnee';
  if (id >= 700 && id < 800) return 'Nebel';
  return 'Bewölkt';
}
