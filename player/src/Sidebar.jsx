"use client"

import { Play, Calendar, Clock, ChevronRight, Radio } from "lucide-react"
import LiveChat from "./LiveChat"

export default function Sidebar({
  videos,
  currentVideo,
  batch,
  onVideoClick,
  onClose,
  user,
  userId,
  setLiveCount
}) {
  return (
    <div onClick={onClose} className="h-full relative z-[999999] flex flex-col bg-white">
      
      {/* Batch Header */}
      <div className="p-6 border-b border-gray-200">
        {batch?.imageUrl && (
          <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden">
            <img
              src={batch.imageUrl}
              alt={batch.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900">
          {batch?.name || "Course"}
        </h2>

        <p className="text-sm text-gray-600 mt-1">
          {videos?.length || 0} lessons
        </p>
      </div>

      <LiveChat
        user={user}
        videoId={currentVideo?.id}
        userId={userId}
        visible={true}
        onLiveCountChange={setLiveCount}
        inline={true}
      />

    </div>
  )
}