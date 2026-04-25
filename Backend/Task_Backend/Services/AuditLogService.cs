using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Service;

namespace Project.Service;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _db;

    public AuditLogService(ApplicationDbContext db) => _db = db;

    public async Task<PagedResult<AuditLogResponseDTO>> GetLogsAsync(
        string userId, bool isAdmin, AuditQueryParams q)
    {
        // ── Task audit logs ───────────────────────────────────────────────────
        var taskQuery = _db.TaskAuditLogs
            .Include(a => a.User)
            .Include(a => a.Task)
            .AsQueryable();

        if (!isAdmin)
            taskQuery = taskQuery.Where(a => a.UserId == userId);

        // ── Category audit logs ───────────────────────────────────────────────
        var catQuery = _db.CategoryAuditLogs
            .Include(a => a.User)
            .Include(a => a.Category)
            .AsQueryable();

        if (!isAdmin)
            catQuery = catQuery.Where(a => a.UserId == userId);

        // ── Materialise both and merge ────────────────────────────────────────
        var taskLogs = await taskQuery.ToListAsync();
        var catLogs  = await catQuery.ToListAsync();

        var taskDTOs = taskLogs.Select(a => new AuditLogResponseDTO(
            Id:        a.Id,
            Action:    a.Action,
            OldValue:  a.OldValue,
            NewValue:  a.NewValue,
            Timestamp: a.Timestamp,
            TaskId:    a.TaskId,
            TaskTitle: a.Task?.Title,
            UserId:    a.UserId,
            UserName:  a.User?.UserName ?? string.Empty
        ));

        var catDTOs = catLogs.Select(a => new AuditLogResponseDTO(
            Id:        a.Id,
            Action:    a.Action,
            OldValue:  a.OldValue,
            NewValue:  a.NewValue,
            Timestamp: a.Timestamp,
            TaskId:    null,
            TaskTitle: $"[Category] {a.Category?.Name ?? a.NewValue ?? ""}",
            UserId:    a.UserId,
            UserName:  a.User?.UserName ?? string.Empty
        ));

        var merged = taskDTOs.Concat(catDTOs).AsQueryable();

        // ── Action filter ─────────────────────────────────────────────────────
        if (q.Action != AuditActionFilter.All)
        {
            var actionStr = q.Action.ToString();    // e.g. "StatusChanged"

            // Insert a space before capitals so "StatusChanged" matches "Status Changed"
            var spaced = System.Text.RegularExpressions.Regex
                .Replace(actionStr, "([A-Z])", " $1").Trim();

            merged = merged.Where(a =>
                a.Action.Equals(spaced, StringComparison.OrdinalIgnoreCase) ||
                a.Action.Equals(actionStr, StringComparison.OrdinalIgnoreCase));
        }

        // ── Search filter ─────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            merged = merged.Where(a =>
                (a.TaskTitle != null && a.TaskTitle.ToLower().Contains(s)) ||
                a.UserName.ToLower().Contains(s) ||
                a.Action.ToLower().Contains(s)   ||
                (a.OldValue != null && a.OldValue.ToLower().Contains(s)) ||
                (a.NewValue != null && a.NewValue.ToLower().Contains(s)));
        }

        // ── Sort + paginate ───────────────────────────────────────────────────
        var sorted = merged.OrderByDescending(a => a.Timestamp).ToList();

        var page     = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);
        var total    = sorted.Count;

        var items = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize);

        return new PagedResult<AuditLogResponseDTO>(
            Items:      items,
            TotalCount: total,
            Page:       page,
            PageSize:   pageSize,
            TotalPages: (int)Math.Ceiling(total / (double)pageSize)
        );
    }



    
}
