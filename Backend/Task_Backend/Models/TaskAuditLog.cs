// TaskAuditLog.cs
namespace Project.Model;
public class TaskAuditLog
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty; // e.g. "StatusChanged", "Reassigned"
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime Timestamp { get; set; }

    public Guid TaskId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public Tasks Task { get; set; } = null!;
    public User User { get; set; } = null!;
}