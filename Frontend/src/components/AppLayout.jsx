import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TaskDrawer from '../components/TaskDrawer'
import { useState } from 'react'

export default function AppLayout() {
  const [selectedTask, setSelectedTask] = useState(null)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 h-full flex flex-col min-h-0 max-w-screen-xl mx-auto w-full">
          
          {/* 🔥 Pass control down */}
          <Outlet context={{ openTask: setSelectedTask }} />

        </div>
      </main>

      {/* ✅ ONLY ONE DRAWER */}
      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}