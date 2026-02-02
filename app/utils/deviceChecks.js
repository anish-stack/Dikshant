// utils/deviceChecks.js
import { Platform, Settings } from "react-native";

export const isDeveloperOptionsEnabled = async () => {
  if (Platform.OS !== "android") return false;

  try {
    // Android Settings.Global.DEVELOPMENT_SETTINGS_ENABLED
    // Value 0 = disabled, 1 = enabled
    const devSettingsEnabled = Settings.get("development_settings_enabled");
        console.log("devSettingsEnabled ",devSettingsEnabled )
    // Settings.get() returns string, so convert to boolean
    return devSettingsEnabled === "1" || devSettingsEnabled === 1;
  } catch (error) {
    console.warn("Could not read developer settings:", error);
    return false;
  }
};