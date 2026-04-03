import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ferme-api.sterveshop.cloud'

const api = axios.create({ baseURL: API_URL })

// Injecte le token JWT automatiquement
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('farm_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirige vers login si 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('farm_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
