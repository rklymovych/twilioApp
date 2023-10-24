import { Track, VideoBandwidthProfileOptions } from 'twilio-video';

export interface Settings {
  trackSwitchOffMode: VideoBandwidthProfileOptions['trackSwitchOffMode'];
  dominantSpeakerPriority?: Track.Priority;
  bandwidthProfileMode: VideoBandwidthProfileOptions['mode'];
  maxAudioBitrate: string;
  contentPreferencesMode?: 'auto' | 'manual';
  clientTrackSwitchOffControl?: 'auto' | 'manual';
}

type SettingsKeys = keyof Settings;

export interface SettingsAction {
  name: SettingsKeys;
  value: string;
}

export const initialSettings: any = {
  // trackSwitchOffMode: undefined,
  // dominantSpeakerPriority: 'standard',
  // // bandwidthProfileMode: 'collaboration',
  // bandwidthProfileMode: 'presentation',
  // video : { height : 720, frameRate : 24, width : 1280 },
  // maxAudioBitrate: '16000',
  // contentPreferencesMode: 'auto',
  // clientTrackSwitchOffControl: 'auto',
  automaticSubscription: true,
  video: { height: 720, frameRate: 24, width: 1280 },
  bandwidthProfile: {
    video: {
      mode: 'presentation',
      trackSwitchOffMode: 'detected',
      maxSubscriptionBitrate: 0,
      contentPreferencesMode: 'auto',
    },
  },
  maxAudioBitrate: 16000,
  preferredVideoCodecs: 'auto',
  networkQuality: { local: 3, remote: 3 },
};

// This inputLabels object is used by ConnectionOptions.tsx. It is used to populate the id, name, and label props
// of the various input elements. Using a typed object like this (instead of strings) eliminates the possibility
// of there being a typo.
export const inputLabels = (() => {
  const target: any = {};
  for (const setting in initialSettings) {
    target[setting] = setting as SettingsKeys;
  }
  return target as { [key in SettingsKeys]: string };
})();

export function settingsReducer(state: Settings, action: SettingsAction) {
  return {
    ...state,
    [action.name]: action.value === 'default' ? undefined : action.value,
  };
}
