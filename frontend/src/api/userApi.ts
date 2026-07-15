import { api } from './axios'

export const userApi = {
  list: () => api.get('/users/'),
  create: (payload: unknown) => api.post('/users/', payload),
}
