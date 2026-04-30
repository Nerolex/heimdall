export interface WeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionId: number;
  city: string;
  sunrise: number;
  sunset: number;
}

export type SunPhase = 'day' | 'golden' | 'night';

export interface WeatherSettings {
  apiKey?: string;
  city?: string;
  units?: string;
  lang?: string;
}
