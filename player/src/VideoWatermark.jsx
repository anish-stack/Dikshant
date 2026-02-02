import React from 'react'

export default function VideoWatermark({ userId }) {
  if (!userId) return null

  return (
    <div className="absolute top-4 right-4 z-50 opacity-10 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
        <span className="text-white text-sm font-mono">{userId}</span>
      </div>
    </div>
  )
}