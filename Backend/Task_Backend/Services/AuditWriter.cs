using Project.Data;
using Project.Model;
using Project.Service;

public class AuditWriter : IAuditWriter
{
    private readonly ApplicationDbContext _db;

    public AuditWriter(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task LogTaskAsync(Guid taskId, string userId, string action, string? oldValue, string? newValue)
    {
        await _db.TaskAuditLogs.AddAsync(new TaskAuditLog
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            UserId = userId,
            Action = action,
            OldValue = oldValue,
            NewValue = newValue,
            Timestamp = DateTime.UtcNow,
        });
    }

    public async Task LogCategoryAsync(
    Guid categoryId, string userId, string action, string? oldValue, string? newValue)
{
    var log = new CategoryAuditLog
    {
        Id = Guid.NewGuid(),
        CategoryId = categoryId,
        UserId = userId,
        Action = action,
        OldValue = oldValue,
        NewValue = newValue,
        Timestamp = DateTime.UtcNow
    };

    await _db.CategoryAuditLogs.AddAsync(log);
}
}