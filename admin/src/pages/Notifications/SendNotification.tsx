import React, { useState } from 'react';
import axios from 'axios';
import { Send, Bell, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface NotificationForm {
  title: string;
  message: string;
  channel: string;
}

const channelOptions = [
  { value: 'default', label: 'General Notifications', color: 'bg-indigo-100 text-indigo-700', icon: '🔔' },
  { value: 'attendance', label: 'Attendance Alerts', color: 'bg-red-100 text-red-700', icon: '✅' },
  { value: 'assignments', label: 'Assignments & Tests', color: 'bg-amber-100 text-amber-700', icon: '📝' },
  { value: 'announcements', label: 'Announcements', color: 'bg-emerald-100 text-emerald-700', icon: '📢' },
  { value: 'courses', label: 'Course Updates', color: 'bg-purple-100 text-purple-700', icon: '📚' },
  { value: 'tests', label: 'Test Reminders', color: 'bg-cyan-100 text-cyan-700', icon: '⏰' },
];

const SendNotification: React.FC = () => {
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    message: '',
    channel: 'default', 
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await axios.post('https://www.dikapi.olyox.in/api/notifications/send-notification', {
        title: form.title.trim(),
        message: form.message.trim(),
        channel: form.channel,
      });

      setSuccess('Notification sent successfully!');
      // Reset form after success
      setForm({ title: '', message: '', channel: 'default' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
      // Auto clear messages after 5 seconds
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  const selectedChannel = channelOptions.find(opt => opt.value === form.channel);

  return (
    <div className="min-h-screen bg-gray-50  px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Bell className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Send Push Notification</h1>
          <p className="text-gray-600 mt-2">Broadcast important updates to all Student</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="">
            <div className="bg-white h-full">
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. New Test Series Available!"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Message Body
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Write your notification message here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                      required
                    />
                  </div>

                  {/* Channel Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notification Channel
                    </label>
                    <select
                      name="channel"
                      value={form.channel}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      {channelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>

                    {/* Visual Preview of Selected Channel */}
                    {selectedChannel && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm text-gray-600">Selected:</span>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${selectedChannel.color}`}>
                          {selectedChannel.icon} {selectedChannel.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Success / Error Messages */}
                  {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{success}</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending Notification...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Notification
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Make sure the channel name matches exactly with Android channels created in the app.
        </p>
      </div>
    </div>
  );
};

export default SendNotification;