import { api } from './axios'

export const companyApi = {
  getCurrent: () => api.get('/company/'),
  update: (payload: unknown) => api.put('/company/', payload),
}
