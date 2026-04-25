using Project.Model;

namespace Project.DTO;

// ─── Task DTOs ───────────────────────────────────────────────────────────────

public record CreateTaskDTO(
    string              Title,
    string?             Description,
    TaskPriority        Priority,
    TaskStatus          InitialStatus,      // Only Todo or InProgress
    string?             AssignedToUserId,
    DateTime?           DueDate,
    Guid?               CategoryId,
    bool                IsPrivate = false
);

public record UpdateTaskDTO(
    string              Title,
    string?             Description,
    TaskPriority        Priority,
    string?             AssignedToUserId,
    DateTime?           DueDate,
    Guid?               CategoryId
);

/// <summary>Used by assignee-only status update endpoint.</summary>
public record UpdateStatusDTO(TaskStatus Status);

public record TaskResponseDTO(
    Guid                Id,
    string              Title,
    string?             Description,
    TaskPriority        Priority,
    TaskStatus          Status,
    DateTime?           DueDate,
    DateTime            CreatedAt,
    DateTime            UpdatedAt,
    bool                IsPrivate,
    string              CreatedByUserId,
    string              CreatedByName,
    string?             AssignedToUserId,
    string?             AssignedToName,
    Guid?               CategoryId,
    string?             CategoryName,
    string?             CategoryColor,
    int                 CommentCount,
    IEnumerable<CommentResponseDTO>  Comments,
    IEnumerable<AuditLogResponseDTO> AuditLogs
);

// ─── Comment DTOs ─────────────────────────────────────────────────────────────

public record AddCommentDTO(string Content);

public record CommentResponseDTO(
    Guid        Id,
    string      Content,
    string      UserId,
    string      UserName,
    DateTime    CreatedAt
);

// ─── Audit Log DTOs ──────────────────────────────────────────────────────────

public record AuditLogResponseDTO(
    Guid        Id,
    string      Action,
    string?     OldValue,
    string?     NewValue,
    DateTime    Timestamp,
    Guid?       TaskId,
    string?     TaskTitle,
    string      UserId,
    string      UserName
);

// ─── Category DTOs ───────────────────────────────────────────────────────────

public record CreateCategoryDTO(
    string  Name,
    string? Color
);

public record UpdateCategoryDTO(
    string  Name,
    string? Color
);

public record ResponseCategoryDTO(
    string CreatedByUserId,
    Guid    Id,
    string  Name,
    string? Color,
    bool    IsGlobal,
    int     TaskCount
);

// ─── MyTasks response ─────────────────────────────────────────────────────────

public record MyTasksDTO(
    IEnumerable<TaskResponseDTO> AssignedActive,
    IEnumerable<TaskResponseDTO> AssignedCompleted,
    IEnumerable<TaskResponseDTO> Created
);
