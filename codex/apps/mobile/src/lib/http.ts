import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getStoredSessionToken } from './secure-session';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000/api';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredSessionToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetryableRequestConfig | undefined;
  const shouldRetry =
    !!config &&
    (error.code === 'ECONNABORTED' ||
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600));

  if (!config || !shouldRetry) {
    throw error;
  }

  config._retryCount = (config._retryCount ?? 0) + 1;
  if (config._retryCount > 2) {
    throw error;
  }

  await wait(250 * 2 ** (config._retryCount - 1));
  return apiClient.request(config);
});

