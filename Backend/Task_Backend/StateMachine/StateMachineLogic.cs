namespace Project.StateMachine;

public static class StateMachineLogic
{
    public static bool IsValidTransition(TaskStatus current, TaskStatus next)
{
    // If it's already in the target state, no change needed (or allow it as a "no-op")
    if (current == next) return true;

    return current switch
    {
        TaskStatus.Todo => next is TaskStatus.InProgress or TaskStatus.Cancelled,
        
        TaskStatus.InProgress => next is TaskStatus.Completed 
                                     or TaskStatus.OnHold 
                                     or TaskStatus.Cancelled,
        
        TaskStatus.OnHold => next is TaskStatus.InProgress or TaskStatus.Cancelled,
        
        // Once Completed or Cancelled, the task is in a "Terminal State"
        // No further transitions allowed.
        TaskStatus.Completed => false,
        TaskStatus.Cancelled => false,
        
        _ => false
    };
}
}