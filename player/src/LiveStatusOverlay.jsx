import { Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function LiveStatusOverlay({ canJoin, hasEnded, timeToLive, onJoinLive }) {
  // If can join, don't show overlay
  if (canJoin) return null

  // Live session ended
  if (hasEnded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
        <div className="text-center text-white p-8 max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-2xl font-bold mb-2">Live Session Ended</h3>
          <p className="text-gray-300 mb-4">This live session has concluded. The recording will be available soon.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Check back later for the recording</span>
          </div>
        </div>
      </div>
    )
  }

  // Live session not started yet
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm">
      <div className="text-center text-white p-8 max-w-md">
        <div className="relative mb-6">
          <Clock className="w-20 h-20 mx-auto text-blue-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-blue-400/30 rounded-full animate-ping" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-3">Live Session Coming Soon</h3>

        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full text-lg font-semibold mb-4">
          {timeToLive}
        </div>

        <p className="text-blue-100 mb-6">You can join the session 5 minutes before it starts</p>

        <div className="flex flex-col gap-3 text-sm text-blue-200">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Make sure you have a stable internet connection</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Enable notifications to get session reminders</span>
          </div>
        </div>

        <button disabled className="mt-6 px-6 py-2.5 bg-white/20 text-white rounded-lg cursor-not-allowed opacity-50">
          Join Session (Not Available Yet)
        </button>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  )
}
