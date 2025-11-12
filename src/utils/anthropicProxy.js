const FALLBACK_PROXY_URL = 'http://localhost:3001/anthropic-proxy';

const removeTrailingSlash = (url) => url.replace(/\/+$/, '');

/**
 * Resolve the Anthropic proxy URL used by the frontend.
 * Priority:
 *   1. REACT_APP_ANTHROPIC_PROXY_URL environment variable
 *   2. Current origin + `/api/anthropic-proxy` (for Vercel/Netlify serverless deployment)
 *   3. Local development fallback (`http://localhost:3001/anthropic-proxy`)
 */
export const resolveAnthropicProxyUrl = () => {
  const envUrl = (process.env.REACT_APP_ANTHROPIC_PROXY_URL || '').trim();

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${removeTrailingSlash(window.location.origin)}/api/anthropic-proxy`;
  }

  return FALLBACK_PROXY_URL;
};

/**
 * Returns the base URL (without the `/anthropic-proxy` segment) for display
 * and health-check purposes.
 */
export const resolveAnthropicProxyBaseUrl = () => {
  const proxyUrl = removeTrailingSlash(resolveAnthropicProxyUrl());
  const base = proxyUrl.replace(/\/anthropic-proxy$/, '');
  return base || proxyUrl;
};

/**
 * Returns the health-check endpoint associated with the proxy.
 */
export const resolveAnthropicProxyHealthUrl = () => {
  const baseUrl = removeTrailingSlash(resolveAnthropicProxyBaseUrl());
  return `${baseUrl}/health`;
};
