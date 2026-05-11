import Constants from 'expo-constants';

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;

  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function resolveProfileInstagramV1Flag() {
  const envValue = process.env.EXPO_PUBLIC_PROFILE_IG_V1;
  const extraValue = Constants.expoConfig?.extra?.profileInstagramV1;

  if (typeof envValue !== 'undefined') {
    return normalizeBoolean(envValue, false);
  }

  return normalizeBoolean(extraValue, false);
}

function resolveProfileSocialV2Flag() {
  const envValue = process.env.EXPO_PUBLIC_PROFILE_SOCIAL_V2;
  const extraValue = Constants.expoConfig?.extra?.profileSocialV2;

  if (typeof envValue !== 'undefined') {
    return normalizeBoolean(envValue, false);
  }

  return normalizeBoolean(extraValue, false);
}

export const isProfileInstagramV1Enabled = resolveProfileInstagramV1Flag();
export const isProfileSocialV2Enabled = resolveProfileSocialV2Flag();

export const featureFlags = {
  isProfileSocialV2Enabled,
  isProfileInstagramV1Enabled,
};

export { normalizeBoolean };
