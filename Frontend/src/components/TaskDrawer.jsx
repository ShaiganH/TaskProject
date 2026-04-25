import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskDetailPanel from './TaskDetailPanel'

export default function TaskDrawer({ task, onClose, onRefresh }) {
  // Lock body scroll while open
  useEffect(() => {
    if (task) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [task])

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Dim overlay — starts after sidebar width */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[30%]"
          >
            <TaskDetailPanel task={task} onClose={onClose} onRefresh={onRefresh} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}