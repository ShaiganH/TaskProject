import { format, isPast, isToday, differenceInDays, startOfDay, differenceInMinutes } from 'date-fns'

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch { return dateStr }
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isToday(d)) return 'Today, ' + format(d, 'HH:mm')
    if (differenceInDays(new Date(), d) === 1) return 'Yesterday, ' + format(d, 'HH:mm')
    return format(d, 'MMM d, HH:mm')
  } catch { return dateStr }
}

export const isDueSoon = (dateStr, status) => {
  if (!dateStr || status === 'Completed' || status === 'Cancelled') return false;
  const d = new Date(dateStr);
  const today = startOfDay(new Date());
  const diff = differenceInDays(d, today);
  // Due soon if it's within the next 3 days and NOT already overdue
  return diff >= 0 && diff <= 3;
}

export const isOverdue = (dateStr, status,now = new Date()) => {
  if (!dateStr || status === 'Completed' || status === 'Cancelled') return false;

  const d = new Date(dateStr);

  return d < now;
};

export const isTaskDueToday = (dateStr, status, now = new Date()) => {
  if (!dateStr || status === 'Completed' || status === 'Cancelled') return false;

  return isToday(new Date(dateStr));
};

export const dueDateLabel = (dateStr) => {
  if (!dateStr) return null

  try {
    const d = new Date(dateStr)
    const now = new Date()

    const diffMin = differenceInMinutes(d, now)

    // 🔴 OVERDUE
    if (diffMin < 0) {
      const absMin = Math.abs(diffMin)
      const days = Math.floor(absMin / (60 * 24))
      const hours = Math.floor((absMin % (60 * 24)) / 60)
      const mins = absMin % 60
      if (days > 0) return `${days}d ${hours}h ${mins}m overdue`
      return `${hours}h ${mins}m overdue`
    }

    // 🟡 TODAY (still upcoming)
    if (isToday(d)) {
      const hours = Math.floor(diffMin / 60)
      const mins  = diffMin % 60

      if (hours > 0) return `in ${hours}h ${mins}m`
      return `in ${mins}m`
    }

    // 🟢 FUTURE
    const diffDays = differenceInDays(d, now)

    if (diffDays === 1) return 'Tomorrow'
    return format(d, 'MMM d')

  } catch {
    return dateStr
  }
}

export const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export const getPriorityClass = (p) => ({
  Critical: 'badge-critical',
  High:     'badge-high',
  Medium:   'badge-medium',
  Low:      'badge-low',
}[p] || 'badge-low')

export const getStatusClass = (s) => ({
  Todo:       'badge-todo',
  InProgress: 'badge-inprogress',
  OnHold:     'badge-onhold',
  Completed:  'badge-completed',
  Cancelled:  'badge-cancelled',
}[s] || 'badge-todo')

export const getStatusDotClass = (s) => ({
  Todo:       'status-dot-todo',
  InProgress: 'status-dot-inprogress',
  OnHold:     'status-dot-onhold',
  Completed:  'status-dot-completed',
  Cancelled:  'status-dot-cancelled',
}[s] || 'status-dot-todo')

export const statusLabel = (s) => ({
  Todo:       'To do',
  InProgress: 'In progress',
  OnHold:     'On hold',
  Completed:  'Completed',
  Cancelled:  'Cancelled',
}[s] || s)

export const actionLabel = (action) => ({
  TaskCreated:     'Task created',
  TaskDeleted:     'Task deleted',
  StatusChanged:   'Status changed',
  CategoryChanged: 'Category changed',
  CommentAdded:    'Comment added',
  Login:           'Login',
}[action] || action)

export const actionClass = (action) => ({
  TaskCreated:     'bg-green-50 text-green-700',
  TaskDeleted:     'bg-red-50 text-red-600',
  StatusChanged:   'bg-amber-50 text-amber-700',
  CategoryChanged: 'bg-blue-50 text-blue-700',
  CommentAdded:    'bg-purple-50 text-purple-700',
  Login:           'bg-gray-100 text-gray-600',
}[action] || 'bg-gray-100 text-gray-600')

export const downloadFile = (content, filename, mime = 'text/plain') => {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export const formatTime = (date) => {
  if (!date) return '—';
  
  return new Date(date).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // Uses AM/PM format
    timeZone: 'Asia/Karachi'
  });
};

export const clsx = (...args) => args.filter(Boolean).join(' ')
