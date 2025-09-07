import React, { useState, useEffect } from 'react'
import styles from './Weather.module.css'

const isValidWeather = (d) =>
  d &&
  typeof d === 'object' &&
  d.sys &&
  d.main &&
  Array.isArray(d.weather) &&
  d.weather[0] &&
  typeof d.name === 'string'

const Weather = () => {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('light')
  const [history, setHistory] = useState([])

  const apiKey = '908232d26530bd4b21394cc29a269929'

  const cityHandler = (e) => {
    const newCity = e.target.value
    setCity(newCity)
    localStorage.setItem('city', newCity)
  }

  const themeSwitcher = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const searchCity = async () => {
    if (!city.trim()) return
    try {
      setError(null)
      setWeather(null)
      setLoading(true)

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          city.trim()
        )}&appid=${apiKey}&units=metric&lang=en`
      )

      const data = await res.json()

      if (String(data.cod) !== '200' || !isValidWeather(data)) {
        setError(data.message || 'Unexpected API response')
        return
      }

      // ✅ зберігаємо в історію нормалізоване ім'я
      setHistory((prev) => {
        const cityName = data.name
        const newHistory = [
          cityName,
          ...prev.filter((e) => e !== cityName),
        ].slice(0, 5)
        localStorage.setItem('history', JSON.stringify(newHistory))
        return newHistory
      })

      setWeather(data)
      localStorage.setItem('weather', JSON.stringify(data))
      localStorage.setItem('city', data.name)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function fetchWeatherByCoords(lat, lon) {
    setLoading(true)
    setError(null)
    setWeather(null)
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=en`
      )
      if (!res.ok) throw new Error('Failed to fetch weather')
      const data = await res.json()
      setWeather(data)
      localStorage.setItem('lastCoords', JSON.stringify({ lat, lon }))
    } catch (e) {
      setError(e.message || 'Request error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const savedCity = localStorage.getItem('city')
      const savedWeather = localStorage.getItem('weather')
      const savedTheme = localStorage.getItem('theme')
      const savedHistory = localStorage.getItem('history')

      if (savedCity) setCity(savedCity)
      if (savedTheme) setTheme(savedTheme)
      if (savedHistory) setHistory(JSON.parse(savedHistory)) // ✅ виправлено
      if (savedWeather) {
        const parsed = JSON.parse(savedWeather)
        if (isValidWeather(parsed)) {
          setWeather(parsed)
        } else {
          localStorage.removeItem('weather')
        }
      }
    } catch {
      localStorage.removeItem('weather')
    }
  }, [])

  function requestGeoAndFetch() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchWeatherByCoords(latitude, longitude)
      },
      (err) => {
        const map = {
          1: 'Access to geolocation denied',
          2: 'Unable to determine position',
          3: 'Geolocation request timed out',
        }
        setError(map[err.code] || 'Geolocation error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    )
  }

  return (
    <div className={theme === 'light' ? styles.wrapper : styles.wrapperDark}>
      <h1 className={styles.title}>🌤️ Weather App</h1>

      <div className={styles.search}>
        <div>
          <input
            type="text"
            value={city}
            onChange={cityHandler}
            placeholder="Enter city..."
            className={styles.input}
          />
          <button onClick={searchCity} className={styles.button}>
            Find
          </button>
        </div>
        <div>
          <button onClick={searchCity} className={styles.button}>
            Refresh
          </button>
          <button onClick={themeSwitcher} className={styles.button}>
            Switch theme
          </button>
          <button onClick={requestGeoAndFetch} className={styles.button}>
            📍 My location
          </button>
        </div>
      </div>

      {/* ✅ блок з історією */}
      {history.length > 0 && (
        <div className={styles.history}>
          <h3>Recent searches:</h3>
          <ul>
            {history.map((h) => (
              <li key={h}>
                <button
                  className={styles.historyBtn}
                  onClick={() => {
                    setCity(h)
                    // автоматичний пошук після кліку
                    searchCity()
                  }}
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p>Loading...</p>}
      {isValidWeather(weather) && (
        <div className={styles.card}>
          <h2 className={styles.city}>
            {weather.name}, {weather.sys.country}
          </h2>
          <img
            src={`https://openweathermap.org/img/wn/${weather.weather?.[0]?.icon}@2x.png`}
            alt={weather.weather?.[0]?.description || 'weather icon'}
            className={styles.icon}
          />
          <p className={styles.temp}>{Math.round(weather.main.temp)}°C</p>
          <p className={styles.feels}>
            Feels like: {Math.round(weather.main.feels_like)}°C
          </p>
          <p className={styles.desc}>{weather.weather?.[0]?.description}</p>

          <div className={styles.details}>
            <p>
              🌡️ Min: {Math.round(weather.main.temp_min)}°C | Max:{' '}
              {Math.round(weather.main.temp_max)}°C
            </p>
            <p>💧 Humidity: {weather.main.humidity}%</p>
            <p>📊 Pressure: {weather.main.pressure} hPa</p>
            <p>
              🌬️ Wind: {weather.wind?.speed} m/s ({weather.wind?.deg}°)
            </p>
            <p>☁️ Clouds: {weather.clouds?.all}%</p>
            <p>🌫️ Visibility: {weather.visibility / 1000} km</p>
            <p>
              📍 Coords: [{weather.coord?.lat}, {weather.coord?.lon}]
            </p>
            <p>
              🌅 Sunrise:{' '}
              {new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}
            </p>
            <p>
              🌇 Sunset:{' '}
              {new Date(weather.sys.sunset * 1000).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Weather
