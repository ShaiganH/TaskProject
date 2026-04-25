namespace Project.Model;

/// <summary>
/// Tracks create / update / delete events on categories.
/// Kept separate from TaskAuditLog so foreign key constraints stay clean
/// (TaskAuditLog.TaskId is non-nullable; category events have no associated task).
/// The AuditLogService merges both tables into one unified response for the UI.
/// </summary>
public class CategoryAuditLog
{
    public Guid     Id         { get; set; }
    public string   Action     { get; set; } = string.Empty; // "Category Created" | "Category Updated" | "Category Deleted"
    public string?  OldValue   { get; set; }
    public string?  NewValue   { get; set; }
    public DateTime Timestamp  { get; set; }

    // FK to the category (nullable — category may be deleted)
    public Guid?     CategoryId { get; set; }
    public Category? Category   { get; set; } = null!;

    // FK to the user who performed the action
    public string   UserId     { get; set; } = string.Empty;
    public User     User       { get; set; } = null!;
}
