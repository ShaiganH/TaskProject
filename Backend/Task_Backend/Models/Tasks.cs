namespace Project.Model;

public class Tasks
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; }
    public TaskStatus Status { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsPrivate { get; set; } = false;
    public DateTime UpdatedAt { get; set; }

    // Foreign keys
    public string CreatedByUserId { get; set; } = string.Empty;
    public string? AssignedToUserId { get; set; }
    public Guid? CategoryId { get; set; }

    // Navigation properties
    public User CreatedBy { get; set; } = null!;
    public User? AssignedTo { get; set; }
    public Category? Category { get; set; }
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<TaskAuditLog> AuditLogs { get; set; } = new List<TaskAuditLog>();
}

