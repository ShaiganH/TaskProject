using Project.Model;

namespace Project.DTO;

// ─── Pagination wrapper ───────────────────────────────────────────────────────
public record PagedResult<T>(
    IEnumerable<T> Items,
    int            TotalCount,
    int            Page,
    int            PageSize,
    int            TotalPages
);

public enum MyTaskFilter { All, Assigned, Created }

public class TaskQueryParams
{
    public string?      Search   { get; set; }
    public TaskStatus?  Status   { get; set; }
    public TaskPriority? Priority { get; set; }
    public Guid?        CategoryId { get; set; }
    public TaskSortBy   SortBy   { get; set; } = TaskSortBy.NewestFirst;
    public int          Page     { get; set; } = 1;
    public int          PageSize { get; set; } = 20;
    public MyTaskFilter Filter   { get; set; } = MyTaskFilter.All;
}

public enum TaskSortBy
{
    NewestFirst,
    OldestFirst,
    DueDateEarliest,
    DueDateLatest,
    PriorityHighest,
}

// ─── Audit log query params ───────────────────────────────────────────────────
public class AuditQueryParams
{
    public string?          Search   { get; set; }
    public AuditActionFilter Action  { get; set; } = AuditActionFilter.All;
    public int              Page     { get; set; } = 1;
    public int              PageSize { get; set; } = 20;
}

public enum AuditActionFilter
{
    All, TaskCreated, StatusChanged, CategoryChanged, CommentAdded, Login, TaskDeleted,
}

// ─── Profile DTOs ─────────────────────────────────────────────────────────────
public record UpdateProfileDTO(string? Bio, string? Designation);

public record ChangePasswordDTO(
    string CurrentPassword,
    string NewPassword,
    string ConfirmNewPassword
);

public record UserProfileDTO(
    string   Id,
    string   Email,
    string   FirstName,
    string   LastName,
    string?  Bio,
    string?  Designation,
    string?  ProfilePictureUrl,
    string   Role,
    DateTime CreatedAt
);

// ─── Export / Import ─────────────────────────────────────────────────────────
public record ImportTaskRow(
    string  Title,
    string? Description,
    string  Priority,
    string  Status,
    string? DueDate,
    string? Category,
    string? AssignedToEmail
);

public record ImportResultDTO(
    int                      Imported,
    int                      Failed,
    IEnumerable<ImportError> Errors
);

public record ImportError(int Row, string Reason);

// ─── Admin DTOs ──────────────────────────────────────────────────────────────

public record UpdateNameDTO(string FirstName, string LastName);

public record UpdateDesignationDTO(string Designation);

/// <summary>
/// Admin can patch any subset of these fields on any task.
/// Null means "don't change this field".
/// </summary>
public record AdminEditTaskDTO(
    string?       Title,
    string?       Description,
    TaskPriority? Priority,
    DateTime?     DueDate,
    string?       AssignedToUserId,
    Guid?         CategoryId
);

public record CreateGlobalCategoryDTO(string Name, string? Color);