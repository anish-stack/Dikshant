"use client"

import { Play, Calendar, Clock, ChevronRight, Radio } from "lucide-react"

export default function Sidebar({ videos, currentVideo, batch, onVideoClick, onClose }) {
  return (
    <div onClick={onClose} className="h-full relative z-[999999px] flex flex-col bg-white">
      {/* Batch Header */}
      <div className="p-6 border-b border-gray-200">
        {batch?.imageUrl && (
          <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden">
            <img src={batch.imageUrl} alt={batch.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900">{batch?.name || "Course"}</h2>
        <p className="text-sm text-gray-600 mt-1">{videos.length} lessons</p>
      </div>

      {/* Video List */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-semibold text-xs uppercase text-gray-500 mb-3 px-2">Course Content</h3>
        <ul className="space-y-1">
          {videos.map((video, idx) => {
            const isActive = currentVideo?.id === video.id
            const isLive = video.isLive && !video.isLiveEnded

            return (
              <li key={video.id}>
                <button
                  onClick={() => {
                    onVideoClick(video)
                    if (onClose) onClose()
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isActive ? "bg-blue-50 border-l-4 border-blue-600 shadow-sm" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Number/Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isActive ? (
                        <Play className="w-4 h-4 fill-current" />
                      ) : (
                        <span className="text-sm font-semibold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${isActive ? "text-blue-900" : "text-gray-900"}`}>
                          {video.title}
                        </p>
                        {isLive && (
                          <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <Radio className="w-3 h-3" />
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(video.dateOfClass).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {video.TimeOfClass && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{video.TimeOfClass}</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar (Optional - can be added if you track video progress) */}
                      {video.progress && (
                        <div className="mt-2">
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${video.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow Indicator */}
                    {!isActive && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 self-center" />}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Resources</h3>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-gray-200">
          <Download className="w-4 h-4 text-blue-600" />
          <span>Go To App</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-gray-200">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>View Transcript</span>
        </button>
      </div> */}
    </div>
  )
}
