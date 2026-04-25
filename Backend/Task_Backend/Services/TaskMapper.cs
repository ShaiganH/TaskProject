using Project.DTO;
using Project.Model;

public static class TaskMapper
{
    public static TaskResponseDTO MapToDTO(Tasks t) => new(
        Id: t.Id,
        Title: t.Title,
        Description: t.Description,
        Priority: t.Priority,
        Status: t.Status,
        DueDate: t.DueDate,
        CreatedAt: t.CreatedAt,
        UpdatedAt: t.UpdatedAt,
        IsPrivate: t.IsPrivate,
        CreatedByUserId: t.CreatedByUserId,
        CreatedByName: t.CreatedBy?.UserName ?? string.Empty,
        AssignedToUserId: t.AssignedToUserId,
        AssignedToName: t.AssignedTo?.UserName,
        CategoryId: t.CategoryId,
        CategoryName: t.Category?.Name,
        CategoryColor: t.Category?.Color,
        CommentCount: t.Comments.Count,
        Comments: t.Comments
                           .OrderBy(c => c.CreatedAt)
                           .Select(c => new CommentResponseDTO(
                               c.Id, c.Content, c.UserId,
                               c.User?.UserName ?? string.Empty, c.CreatedAt)),
        AuditLogs: t.AuditLogs
                           .OrderByDescending(a => a.Timestamp)
                           .Select(a => new AuditLogResponseDTO(
                               a.Id, a.Action, a.OldValue, a.NewValue,
                               a.Timestamp, a.TaskId, t.Title,
                               a.UserId, a.User?.UserName ?? string.Empty))
    );
}