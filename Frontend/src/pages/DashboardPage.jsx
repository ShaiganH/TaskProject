import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare, AlertTriangle, TrendingUp, ClockAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTask } from '../context/TaskContext'
import { StatCard } from '../components/UI'
import TaskTable from '../components/TaskTable'
import NewTaskModal from '../components/NewTaskModal'
import { isOverdue,isTaskDueToday } from '../utils/helpers'
import Pagination from '../components/Pagination'
import { useOutletContext } from 'react-router-dom'

const STATUS_FILTERS = [
  { label: 'All',         value: null },
  { label: 'To do',       value: 'Todo' },
  { label: 'In progress', value: 'InProgress' },
  { label: 'On hold',     value: 'OnHold' },
  { label: 'Completed',   value: 'Completed' },
]

export default function DashboardPage() {
  const { user }  = useAuth()
  const { tasks, pagination, loading, fetchTasks } = useTask()

  const [modal,  setModal]  = useState(false)
  const [status, setStatus] = useState(null)
  const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const { openTask } = useOutletContext()
const [now, setNow] = useState(() => new Date())

useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 60000)
  return () => clearInterval(interval)
}, [])
const load = useCallback(() => {
  const params = {
    page,
    pageSize
  }

  // Only send real statuses to backend
  if (['Todo', 'InProgress', 'OnHold', 'Completed'].includes(status)) {
    params.status = status
  }

  fetchTasks(params)
}, [fetchTasks, status, page, pageSize])

  // Refetch whenever filter or page changes
useEffect(() => {
  load()
}, [load]) 

  const handleFilterChange = (val) => { setStatus(val); setPage(1); console.log('Filter changed to', val) }

  // Stats — derived from the current page of tasks (backend returns all assigned/created)
  const myTasks   = tasks
  const inProg    = myTasks.filter(t => t.status === 'InProgress').length

  

const overdue = myTasks.filter(t =>
  isOverdue(t.dueDate, t.status,now)
).length;

const dueToday = myTasks.filter(t =>
  isTaskDueToday(t.dueDate, t.status,now) &&
  !isOverdue(t.dueDate, t.status,now)
).length;


  const completed = myTasks.filter(t => t.status === 'Completed').length;
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const filteredTasks = (() => {
  if (status === 'DueToday') {
    return tasks.filter(t => isTaskDueToday(t.dueDate, t.status))
  }

  if (status === 'Overdue') {
    return tasks.filter(t => isOverdue(t.dueDate, t.status))
  }

  return tasks
})()
 

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {greeting()}, {user?.firstName ?? user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> New task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6 flex-shrink-0">
        <StatCard label="Total tasks"  value={pagination.totalCount} sub="on dashboard"    icon={CheckSquare}   iconBg="bg-blue-50" onClick={() => handleFilterChange(null)} active={status === null} />
        <StatCard label="In progress" onClick={() => handleFilterChange('InProgress')} active={status === 'InProgress'}  value={inProg}     sub="active now"     valueColor="text-brand-600" icon={TrendingUp}  iconBg="bg-brand-50" />
        <StatCard label="Due today" onClick={() => handleFilterChange('DueToday')} active={status === 'DueToday'}    value={dueToday}   sub="needs attention" valueColor={dueToday > 0 ? 'text-red-500' : 'text-gray-900'} icon={AlertTriangle} iconBg="bg-red-50" />
        <StatCard label="Completed"  onClick={() => handleFilterChange('Completed')} active={status === 'Completed'}  value={completed}  sub="this page"      valueColor="text-green-600" icon={CheckSquare} iconBg="bg-green-50" />
        <StatCard 
  label="Overdue"
  onClick={() => handleFilterChange('Overdue')}
  active={status === 'Overdue'}    
  value={overdue}   
  sub="needs attention" 
  valueColor={overdue > 0 ? 'text-red-500' : 'text-gray-900'} 
  icon={ClockAlert} 
  iconBg="bg-red-300" 
/>
      </div>

      {/* Filter pills */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">
          Tasks <span className="text-gray-400 font-normal">({pagination.totalCount})</span>
        </h2>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button key={f.label}
              onClick={() => handleFilterChange(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                status === f.value
                  ? 'bg-brand-50 text-brand-800 border-brand-200 font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <TaskTable
      
        tasks={filteredTasks}
        loading={loading}
        emptyTitle="No tasks here"
        emptySubtitle="Create your first task to get started"
        onRowClick={openTask}
        
      />
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0">
      <Pagination
  page={page}
  totalPages={pagination.totalPages}
  totalCount={pagination.totalCount}
  pageSize={pageSize}
  onPageChange={setPage}
  onPageSizeChange={(size) => {
    setPageSize(size)
    setPage(1)
  }}
/>
</div>

      <NewTaskModal open={modal} onClose={() => { setModal(false); load() }} />
    </div>
  )
}
