import { SettingsResponse, SettingsUpdateRequest } from '@betterdb/shared';
import { fetchApi } from './client';

export const settingsApi = {
  getSettings: () => fetchApi<SettingsResponse>('/settings'),

  updateSettings: (updates: SettingsUpdateRequest) =>
    fetchApi<SettingsResponse>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  resetSettings: () =>
    fetchApi<SettingsResponse>('/settings/reset', {
      method: 'POST',
    }),
};
