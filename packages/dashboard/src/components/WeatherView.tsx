import React, { useEffect, useState } from 'react';

interface WeatherViewData {
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionId: number;
  city: string;
}

interface WeatherViewProps {
  settings: Record<string, unknown>;
}

/** Background gradient + accent based on weather condition */
function getBackground(conditionId: number): { gradient: string; accent: React.ReactElement | null } {
  // OWM condition codes: 2xx thunderstorm, 3xx drizzle, 5xx rain, 6xx snow, 7xx atmosphere, 800 clear, 80x clouds
  if (conditionId === 800) {
    // Clear sky — warm blue gradient with soft sun orb
    return {
      gradient: 'linear-gradient(180deg, #1a8fe0 0%, #56c1f5 40%, #87ceeb 100%)',
      accent: (
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '12%',
          width: '20vw',
          height: '20vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff8c4 0%, #ffd700 40%, rgba(255,215,0,0.3) 65%, transparent 80%)',
          boxShadow: '0 0 60px 20px rgba(255,215,0,0.3)',
        }} />
      ),
    };
  }
  if (conditionId >= 801 && conditionId <= 802) {
    // Few / scattered clouds — light blue with sun orb peeking behind cloud
    return {
      gradient: 'linear-gradient(180deg, #4a9fd5 0%, #7ec8e3 50%, #b0d4e3 100%)',
      accent: (
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '22vw', height: '16vw' }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: '2vw',
            width: '12vw',
            height: '12vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff8c4 0%, #ffd700 40%, rgba(255,215,0,0.2) 70%, transparent 85%)',
            boxShadow: '0 0 40px 10px rgba(255,215,0,0.2)',
          }} />
          <svg viewBox="0 0 200 100" style={{ position: 'absolute', bottom: 0, width: '100%', height: '70%', opacity: 0.7 }}>
            <ellipse cx="110" cy="60" rx="60" ry="32" fill="white" opacity="0.7" />
            <ellipse cx="75" cy="65" rx="40" ry="25" fill="white" opacity="0.5" />
          </svg>
        </div>
      ),
    };
  }
  if (conditionId >= 803) {
    // Overcast — grey gradient
    return {
      gradient: 'linear-gradient(180deg, #5c6b7a 0%, #8899a6 50%, #a0adb8 100%)',
      accent: (
        <svg viewBox="0 0 200 120" style={{ position: 'absolute', top: '12%', right: '8%', width: '22vw', opacity: 0.5 }}>
          <ellipse cx="100" cy="70" rx="70" ry="38" fill="white" opacity="0.4" />
          <ellipse cx="65" cy="78" rx="45" ry="30" fill="white" opacity="0.3" />
          <ellipse cx="140" cy="75" rx="40" ry="28" fill="white" opacity="0.3" />
        </svg>
      ),
    };
  }
  if (conditionId >= 500 && conditionId < 600) {
    // Rain — dark blue-grey
    return {
      gradient: 'linear-gradient(180deg, #2c3e50 0%, #4a6572 50%, #607d8b 100%)',
      accent: null,
    };
  }
  if (conditionId >= 200 && conditionId < 300) {
    // Thunderstorm — dark purple
    return {
      gradient: 'linear-gradient(180deg, #1a1a2e 0%, #2d2b55 50%, #4a4072 100%)',
      accent: null,
    };
  }
  if (conditionId >= 600 && conditionId < 700) {
    // Snow — cool white-blue
    return {
      gradient: 'linear-gradient(180deg, #7f9bab 0%, #b8c9d4 50%, #dce8f0 100%)',
      accent: null,
    };
  }
  if (conditionId >= 300 && conditionId < 400) {
    // Drizzle
    return {
      gradient: 'linear-gradient(180deg, #3d5a6e 0%, #5f8296 50%, #7a9bae 100%)',
      accent: null,
    };
  }
  // Atmosphere (fog, mist, haze)
  return {
    gradient: 'linear-gradient(180deg, #7a8e99 0%, #9eadb6 50%, #bcc8cf 100%)',
    accent: null,
  };
}

/** Full-screen weather view component */
export function WeatherView({ settings }: WeatherViewProps): React.ReactElement {
  const [weather, setWeather] = useState<WeatherViewData | null>(null);
  const [error, setError] = useState(false);

  const apiKey = settings.apiKey as string | undefined;
  const city = settings.city as string | undefined;
  const units = (settings.units as string) || 'metric';
  const lang = (settings.lang as string) || 'de';

  useEffect(() => {
    if (!apiKey || !city) {
      setError(true);
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&lang=${lang}&appid=${apiKey}`;

    function fetchWeather(): void {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setWeather({
            temp: Math.round(data.main.temp),
            tempMin: Math.round(data.main.temp_min),
            tempMax: Math.round(data.main.temp_max),
            condition: data.weather[0].description,
            conditionId: data.weather[0].id,
            city: data.name,
          });
          setError(false);
        })
        .catch(() => setError(true));
    }

    fetchWeather();
    const timer = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [apiKey, city, units, lang]);

  if (error || !weather) {
    const bg = 'linear-gradient(180deg, #2c3e50 0%, #4a6572 100%)';
    return (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        {error ? 'Weather unavailable' : 'Loading…'}
      </div>
    );
  }

  const unitSymbol = units === 'imperial' ? '°F' : '°C';
  const { gradient, accent } = getBackground(weather.conditionId);

  return (
    <div
      data-testid="weather-view"
      style={{
        width: '100%',
        height: '100%',
        background: gradient,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '6vw',
        color: '#fff',
        textShadow: '0 2px 16px rgba(0,0,0,0.6), 0 4px 32px rgba(0,0,0,0.3)',
      }}
    >
      {accent}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '14vw', fontWeight: 700, lineHeight: 1 }}>
          {weather.temp}{unitSymbol}
        </div>
        <div style={{ fontSize: '5vw', fontWeight: 500, marginTop: '0.5vw', textTransform: 'capitalize' }}>
          {weather.condition}
        </div>
        <div style={{ fontSize: '3.5vw', fontWeight: 400, marginTop: '0.5vw', opacity: 0.8 }}>
          {weather.city}
        </div>
        <div style={{ fontSize: '3vw', fontWeight: 400, marginTop: '1vw', opacity: 0.7 }}>
          H: {weather.tempMax}{unitSymbol}  L: {weather.tempMin}{unitSymbol}
        </div>
      </div>
    </div>
  );
}
