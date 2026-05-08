import type { SunPhase } from './types';

type GradientMap = Record<string, string>;

/**
 * Sky gradients for night (after sunset + 45min).
 * All use top-to-bottom (180deg) with deep navy/dark blue tones.
 */
const nightGradients: GradientMap = {
  '800': 'linear-gradient(180deg, #0a1628 0%, #162a4a 40%, #1e3a5f 100%)',       // clear: deep navy → dark blue
  'fewClouds': 'linear-gradient(180deg, #0d1b2a 0%, #1b2838 50%, #2a3a4a 100%)', // slight grey-blue shift
  'overcast': 'linear-gradient(180deg, #1a1a2a 0%, #2a2a3a 50%, #3a3a4a 100%)',  // uniform dark grey
  'rain': 'linear-gradient(180deg, #0f1923 0%, #1a2a38 50%, #253545 100%)',       // cold dark blue-grey
  'thunderstorm': 'linear-gradient(180deg, #0a0a1a 0%, #1a1530 50%, #2a2040 100%)', // near-black with purple
  'snow': 'linear-gradient(180deg, #1a2030 0%, #2a3545 50%, #3a4a5a 100%)',       // cool blue-grey
  'drizzle': 'linear-gradient(180deg, #121d28 0%, #1e3040 50%, #2a4050 100%)',    // muted teal-grey
  'atmosphere': 'linear-gradient(180deg, #1a2030 0%, #2a3040 50%, #3a4050 100%)', // fog/mist: neutral dark
};

/**
 * Sky gradients for golden hour (±45min around sunrise/sunset).
 * Warm orange, pink, and purple tones simulating sunset sky.
 */
const goldenGradients: GradientMap = {
  '800': 'linear-gradient(180deg, #4a7ab5 0%, #c0592b 30%, #e67e22 60%, #f39c12 100%)',   // blue top → orange-gold bottom
  'fewClouds': 'linear-gradient(180deg, #3d1e5c 0%, #a0344a 30%, #d4623a 60%, #e8945a 100%)', // purple → red → warm orange
  'overcast': 'linear-gradient(180deg, #3a2a3e 0%, #5a4050 50%, #7a5560 100%)',   // muted mauve
  'rain': 'linear-gradient(180deg, #2a1e30 0%, #3a3040 50%, #4a4050 100%)',       // dark warm grey
  'thunderstorm': 'linear-gradient(180deg, #1a0a20 0%, #2a1535 50%, #3a2045 100%)', // deep purple-black
  'snow': 'linear-gradient(180deg, #4a3a50 0%, #6a5565 50%, #8a7078 100%)',       // lavender-grey
  'drizzle': 'linear-gradient(180deg, #2a2030 0%, #4a3545 50%, #5a4555 100%)',    // dusty purple
  'atmosphere': 'linear-gradient(180deg, #3a3040 0%, #5a4555 50%, #7a5a65 100%)', // warm haze
};

/**
 * Sky gradients for daytime (after sunrise + 45min, before sunset - 45min).
 * Bright blues, grey overcast, or condition-appropriate tones.
 */
const dayGradients: GradientMap = {
  '800': 'linear-gradient(180deg, #1a8fe0 0%, #56c1f5 40%, #87ceeb 100%)',        // clear: vivid blue → sky blue
  'fewClouds': 'linear-gradient(180deg, #4a9fd5 0%, #7ec8e3 50%, #b0d4e3 100%)', // softer blue with haze
  'overcast': 'linear-gradient(180deg, #5c6b7a 0%, #8899a6 50%, #a0adb8 100%)',  // uniform grey
  'rain': 'linear-gradient(180deg, #2c3e50 0%, #4a6572 50%, #607d8b 100%)',       // dark blue-grey
  'thunderstorm': 'linear-gradient(180deg, #1a1a2e 0%, #2d2b55 50%, #4a4072 100%)', // ominous purple-grey
  'snow': 'linear-gradient(180deg, #7f9bab 0%, #b8c9d4 50%, #dce8f0 100%)',       // bright pale blue
  'drizzle': 'linear-gradient(180deg, #3d5a6e 0%, #5f8296 50%, #7a9bae 100%)',    // muted steel blue
  'atmosphere': 'linear-gradient(180deg, #7a8e99 0%, #9eadb6 50%, #bcc8cf 100%)', // foggy grey-white
};

/**
 * Map OpenWeatherMap condition ID ranges to gradient lookup keys.
 * OWM codes: 2xx=thunderstorm, 3xx=drizzle, 5xx=rain, 6xx=snow,
 * 7xx=atmosphere (fog/mist), 800=clear, 801-802=few/scattered clouds, 803+=overcast
 */
function conditionKey(conditionId: number): string {
  if (conditionId === 800) return '800';
  if (conditionId >= 801 && conditionId <= 802) return 'fewClouds';
  if (conditionId >= 803) return 'overcast';
  if (conditionId >= 500 && conditionId < 600) return 'rain';
  if (conditionId >= 200 && conditionId < 300) return 'thunderstorm';
  if (conditionId >= 600 && conditionId < 700) return 'snow';
  if (conditionId >= 300 && conditionId < 400) return 'drizzle';
  return 'atmosphere';
}

/** Returns true for conditions/phases where background is light enough to need dark text */
export function isLightBackground(conditionId: number, sunPhase: SunPhase): boolean {
  if (sunPhase === 'night' || sunPhase === 'golden') return false;
  const key = conditionKey(conditionId);
  // Daytime overcast and snow are the lightest backgrounds
  return key === 'overcast' || key === 'snow' || key === 'fewClouds';
}
export function getGradient(conditionId: number, sunPhase: SunPhase): string {
  const key = conditionKey(conditionId);

  switch (sunPhase) {
    case 'night': return nightGradients[key] ?? nightGradients['atmosphere']!;
    case 'golden': return goldenGradients[key] ?? goldenGradients['atmosphere']!;
    default: return dayGradients[key] ?? dayGradients['atmosphere']!;
  }
}
