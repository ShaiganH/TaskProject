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
        {/* Spacer for mobile top bar */}
        <div className="lg:hidden h-14 flex-shrink-0" />

        <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 max-w-screen-xl mx-auto w-full">
          <Outlet context={{ openTask: setSelectedTask }} />
        </div>
      </main>

      {/* Task drawer */}
      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
