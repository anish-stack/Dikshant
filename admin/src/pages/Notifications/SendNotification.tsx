import React, { useState } from "react";
import axios from "axios";
import { Send, Bell, Loader2, CheckCircle, XCircle } from "lucide-react";

interface NotificationForm {
  title: string;
  message: string;
  channel: string;
}

const MAX_TITLE = 50;
const MAX_MESSAGE = 100;

const SendNotification: React.FC = () => {
  const [form, setForm] = useState<NotificationForm>({
    title: "",
    message: "",
    channel: "default",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Title is required";
    }

    if (!form.message.trim()) {
      return "Message is required";
    }

    if (form.title.length > MAX_TITLE) {
      return `Title must be less than ${MAX_TITLE} characters`;
    }

    if (form.message.length > MAX_MESSAGE) {
      return `Message must be less than ${MAX_MESSAGE} characters`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      await axios.post(
        "https://www.app.api.dikshantias.com/api/notifications/send-notification",
        {
          title: form.title.trim(),
          message: form.message.trim(),
          channel: form.channel,
        }
      );

      setSuccess("Notification sent successfully!");

      setForm({
        title: "",
        message: "",
        channel: "default",
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading ||
    form.title.length === 0 ||
    form.message.length === 0 ||
    form.title.length > MAX_TITLE ||
    form.message.length > MAX_MESSAGE;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-6">
          <Bell className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Send Push Notification</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* TITLE */}
          <div>
            <label className="text-sm font-semibold">
              Notification Title ({form.title.length}/{MAX_TITLE})
            </label>

            <input
              type="text"
              name="title"
              value={form.title}
              maxLength={MAX_TITLE}
              onChange={handleChange}
              className="w-full mt-2 px-4 py-3 border rounded-xl"
              placeholder="Enter notification title"
            />
          </div>

          {/* MESSAGE */}
          <div>
            <label className="text-sm font-semibold">
              Message ({form.message.length}/{MAX_MESSAGE})
            </label>

            <textarea
              name="message"
              value={form.message}
              maxLength={MAX_MESSAGE}
              rows={3}
              onChange={handleChange}
              className="w-full mt-2 px-4 py-3 border rounded-xl resize-none"
              placeholder="Write notification message..."
            />
          </div>

          {/* CHANNEL */}
          <div>
            <label className="text-sm font-semibold">
              Notification Channel
            </label>

            <select
              name="channel"
              value={form.channel}
              onChange={handleChange}
              className="w-full mt-2 px-4 py-3 border rounded-xl"
            >
              <option value="default">🔔 General</option>
              <option value="attendance">✅ Attendance</option>
              <option value="assignments">📝 Assignments</option>
              <option value="announcements">📢 Announcements</option>
              <option value="courses">📚 Course Updates</option>
              <option value="tests">⏰ Test Reminders</option>
            </select>
          </div>

          {/* SUCCESS */}
          {success && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle size={18} /> {success}
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <XCircle size={18} /> {error}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Notification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendNotification;