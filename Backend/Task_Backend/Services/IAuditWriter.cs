namespace Project.Service;

public interface IAuditWriter
{
    Task LogTaskAsync(Guid taskId, string userId, string action, string? oldValue, string? newValue);
    Task LogCategoryAsync(Guid categoryId, string userId, string action, string? oldValue, string? newValue);
}