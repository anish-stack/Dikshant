import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface AppSettings {
  id?: number;
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  enableQuiz: boolean;
  enableTestSeries: boolean;
  enableScholarship: boolean;
  enableOffers: boolean;
  pushNotificationsEnabled: boolean;
  playStoreUrl: string;
  webSiteUrl: string;
  appStoreUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  paymentsEnabled: boolean;
  androidMinVersion: string;
  androidLatestVersion: string;
  androidForceUpdate: boolean;
  androidUpdateMessage: string;
  iosMinVersion: string;
  iosLatestVersion: string;
  iosForceUpdate: boolean;
  iosUpdateMessage: string;
  forceUpdatePlatform: string;
  forceUpdate: boolean;
  updateMessage: string;
  extra: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const API_GET_URL = 'http://localhost:5001/api/appsettings';
const API_SAVE_URL = 'http://localhost:5001/api/appsettings';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [extraInput, setExtraInput] = useState<string>('{}');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (): Promise<void> => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.get<AppSettings[]>(API_GET_URL);
      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        setSettings(data);
        try {
          const parsed = JSON.parse(data.extra || '{}');
          setExtraInput(JSON.stringify(parsed, null, 2));
        } catch {
          setExtraInput('{}');
        }
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (key: keyof AppSettings, value: string | boolean): Promise<void> => {
    setSavingFields(prev => ({ ...prev, [key]: true }));
    setMessage(null);

    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      setMessage({ type: 'error', text: 'Access token not found. Please login.' });
      setSavingFields(prev => ({ ...prev, [key]: false }));
      return;
    }

    try {
      await axios.post(
        API_SAVE_URL,
        { key, value },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (settings) {
        setSettings({ ...settings, [key]: value });
      }

      setMessage({ type: 'success', text: `${key} saved successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save setting';

      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingFields(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleExtraSave = (): void => {
    try {
      JSON.parse(extraInput); // Validate JSON
      saveField('extra', extraInput.trim());
    } catch {
      setMessage({ type: 'error', text: 'Invalid JSON format in Extra Config' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center gap-4 text-xl text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-red-600">No settings data found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl  overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-10 py-8">
            <h1 className="text-xl font-bold text-white">App Settings Admin</h1>
            <p className="text-indigo-100 text-md mt-2">Dikshant IAS - Manage App Configuration</p>
          </div>

          {message && (
            <div className={`mx-10 mt-8 px-6 py-4 rounded-xl flex items-center gap-4 shadow-md ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <div className="p-10 space-y-12">
            {/* General Settings */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">General Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(['appName', 'appVersion'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field === 'appName' ? 'App Name' : 'App Version'}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={settings[field]}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                        className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                      <button
                        onClick={() => saveField(field, settings[field])}
                        disabled={savingFields[field]}
                        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition"
                      >
                        {savingFields[field] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Feature Toggles */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">Feature Controls</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {([
                  'enableQuiz',
                  'enableTestSeries',
                  'enableScholarship',
                  'enableOffers',
                  'pushNotificationsEnabled',
                  'paymentsEnabled',
                  'maintenanceMode',
                  'forceUpdate',
                ] as const).map(field => (
                  <label key={field} className="flex items-center gap-4 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <input
                      type="checkbox"
                      checked={settings[field]}
                      onChange={(e) => {
                        const newVal = e.target.checked;
                        setSettings(prev => prev ? { ...prev, [field]: newVal } : null);
                        saveField(field, newVal);
                      }}
                      disabled={savingFields[field]}
                      className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="font-medium text-gray-800">
                      {field.replace(/enable|Mode|Update/g, '').trim() || field}
                    </span>
                    {savingFields[field] && <Loader2 className="w-5 h-5 animate-spin text-indigo-600 ml-auto" />}
                  </label>
                ))}
              </div>
            </section>

            {/* Links & Support */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">Links & Support Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {([
                  'playStoreUrl',
                  'webSiteUrl',
                  'appStoreUrl',
                  'privacyPolicyUrl',
                  'termsUrl',
                  'supportEmail',
                  'supportPhone',
                  'supportWhatsapp',
                ] as const).map(field => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.replace(/Url$/, ' URL').replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type={field.includes('Email') ? 'email' : field.includes('Phone') || field.includes('Whatsapp') ? 'tel' : 'url'}
                        value={settings[field]}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                        className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                      <button
                        onClick={() => saveField(field, settings[field])}
                        disabled={savingFields[field]}
                        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition"
                      >
                        {savingFields[field] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;