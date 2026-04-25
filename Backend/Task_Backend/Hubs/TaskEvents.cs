namespace Project.Hubs;

public static class TaskEvents
{
    // Task events
    public const string TaskCreated       = "TaskCreated";
    public const string TaskUpdated       = "TaskUpdated";
    public const string TaskStatusUpdated = "TaskStatusUpdated";
    public const string TaskCommentAdded  = "TaskCommentAdded";
    public const string TaskDeleted       = "TaskDeleted";

    // Category events
    public const string CategoryCreated   = "CategoryCreated";
    public const string CategoryUpdated   = "CategoryUpdated";
    public const string CategoryDeleted   = "CategoryDeleted";

    // Admin-only events (broadcast to all — admin filters on client)
    public const string UserBlocked       = "UserBlocked";
    public const string UserUpdated       = "UserUpdated";   // name / designation changed
}