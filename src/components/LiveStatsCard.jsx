import React from 'react';

export default function LiveStatsCard({ stats }) {
  if (!stats) {
    return (
      <div className="rounded-xl p-4 bg-gray-900 border border-gray-800">
        <div className="animate-pulse h-6 bg-gray-800 rounded w-1/3 mb-2" />
        <div className="animate-pulse h-4 bg-gray-800 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-gray-900 border border-gray-800">
      <h4 className="text-sm font-medium text-gray-200">Live Platform Stats</h4>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-800 rounded">
          <div className="text-xs text-gray-400">Active Rooms</div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.activeRooms}</div>
        </div>
        <div className="p-3 bg-gray-800 rounded">
          <div className="text-xs text-gray-400">Active Users</div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.activeUsers}</div>
        </div>
        <div className="p-3 bg-gray-800 rounded">
          <div className="text-xs text-gray-400">Avg Focus</div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.avgFocus}%</div>
        </div>
      </div>
    </div>
  );
}
