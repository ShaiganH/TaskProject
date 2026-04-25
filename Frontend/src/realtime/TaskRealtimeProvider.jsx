import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';
import { useAdmin } from '../context/AdminContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5210';

const RealtimeContext = createContext(null);

export default function TaskRealtimeProvider({ children }) {
  const { user, token } = useAuth();
  const {
    rtTaskCreated, rtTaskUpdated, rtTaskDeleted, rtCommentAdded,
    rtCategoryCreated, rtCategoryUpdated, rtCategoryDeleted,
  } = useTask();

  // AdminContext is optional here — if user is not admin it's a no-op
  const { registerConnection } = useAdmin();

  const connectionRef = useRef(null);
  const [conn, setConn] = useState(null);

  // Keep a ref to latest callbacks so handlers are always fresh
  const cbRef = useRef({});
  cbRef.current = {
    rtTaskCreated, rtTaskUpdated, rtTaskDeleted, rtCommentAdded,
    rtCategoryCreated, rtCategoryUpdated, rtCategoryDeleted,
    registerConnection,
    _token: token,
    _currentUserId: user?.id,
  };

  useEffect(() => {
    if (!user || !token) return;
    if (connectionRef.current) return; // already connected

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/tasks`, {
        accessTokenFactory: () => cbRef.current._token ?? token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning
      )
      .build();

    connectionRef.current = connection;
    setConn(connection);


    // Inside the useEffect where you set up SignalR listeners:
connection.on('UserBlocked', ({ userId, blocked }) => {
  // Check if this event is about the currently logged-in user
  if (blocked && userId === cbRef.current._currentUserId) {
    // Dispatch the same force-logout event
    window.dispatchEvent(new CustomEvent('auth:force-logout', {
      detail: { reason: 'blocked' }
    }));
  }
});

    // ── Task events ─────────────────────────────────────────────────────────
    connection.on('TaskCreated', (task) => {
      cbRef.current.rtTaskCreated(task);
    });

    connection.on('TaskUpdated', (task) => {
      cbRef.current.rtTaskUpdated(task.id, task);
    });

    connection.on('TaskStatusUpdated', (payload) => {
      cbRef.current.rtTaskUpdated(payload.id, {
        status:    payload.status,
        updatedAt: payload.updatedAt,
      });
    });

    connection.on('TaskDeleted', (taskId) => {
      cbRef.current.rtTaskDeleted(taskId);
    });

    connection.on('TaskCommentAdded', (payload) => {
      cbRef.current.rtCommentAdded(payload.taskId, {
        id:        payload.id,
        content:   payload.content,
        userId:    payload.userId,
        createdAt: payload.createdAt,
      });
    });

    connection.on('TaskDueChanged', (task) => {
      cbRef.current.rtTaskUpdated(task.id, { dueDate: task.dueDate });
    });

    // ── Category events ──────────────────────────────────────────────────────
    connection.on('CategoryCreated', (cat) => {
      cbRef.current.rtCategoryCreated(cat);
    });

    connection.on('CategoryUpdated', (cat) => {
      cbRef.current.rtCategoryUpdated(cat.id, cat);
    });

    connection.on('CategoryDeleted', (catId) => {
      cbRef.current.rtCategoryDeleted(catId);
    });

    // ── Lifecycle ────────────────────────────────────────────────────────────
    connection.onclose((err) => {
      if (err) console.error('[RT] Closed with error:', err);
      else     console.log('[RT] Closed cleanly');
    });
    connection.onreconnecting(() => console.warn('[RT] Reconnecting…'));
    connection.onreconnected(() => {
      console.log('[RT] Reconnected');
      // Re-register admin listeners on reconnect
      cbRef.current.registerConnection(connection);
    });

    const start = async () => {
      try {
        await connection.start();
        console.log('[RT] Connected');
        // Give AdminContext the live connection so it can attach its own listeners
        cbRef.current.registerConnection(connection);
      } catch (err) {
        console.error('[RT] Failed to connect:', err);
        setTimeout(start, 5000);
      }
    };

    start();

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  cbRef.current._token = token;

  return (
    <RealtimeContext.Provider value={conn}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);
