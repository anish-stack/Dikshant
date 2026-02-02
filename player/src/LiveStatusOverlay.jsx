import { Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function LiveStatusOverlay({
  canJoin,
  hasEnded,
  timeToLive,
  onJoinLive,
}) {
  if (canJoin) return null

  // 🔴 Live session ended
  if (hasEnded) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="text-center text-white p-6 sm:p-8 max-w-sm sm:max-w-md w-full">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-green-400" />

          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Live Session Ended
          </h3>

          <p className="text-gray-300 text-sm sm:text-base mb-4">
            This live session has concluded. The recording will be available soon.
          </p>

          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs sm:text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Check back later for the recording</span>
          </div>
        </div>
      </div>
    )
  }

  // ⏳ Live session not started
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm px-4">
      <div className="text-center text-white p-6 sm:p-8 max-w-sm sm:max-w-md w-full">
        {/* Clock */}
        <div className="relative mb-4 sm:mb-6">
          <Clock className="w-14 h-14 sm:w-20 sm:h-20 mx-auto text-blue-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-blue-400/30 rounded-full animate-ping" />
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">
          Live Session Coming Soon
        </h3>

        <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-md rounded-full text-base sm:text-lg font-semibold mb-3 sm:mb-4">
          {timeToLive}
        </div>

        <p className="text-blue-100 text-sm sm:text-base mb-4 sm:mb-6">
          You can join the session 5 minutes before it starts
        </p>

        <div className="flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm text-blue-200">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Stable internet connection required</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Enable notifications for reminders</span>
          </div>
        </div>

        <button
          disabled
          className="mt-5 sm:mt-6 w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-white/20 text-white rounded-lg cursor-not-allowed opacity-50 text-sm sm:text-base"
        >
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
