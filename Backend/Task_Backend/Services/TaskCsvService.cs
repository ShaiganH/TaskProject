using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Model;

namespace Project.Service;

public class TaskCsvService:ITaskCsvService
{
    private readonly ApplicationDbContext _db;

    public TaskCsvService(ApplicationDbContext db)
    {
        _db = db;
    }


// ─────────────────────────────────────────────────────────────────────────
    // EXPORT — CSV
    // GET /api/tasks/export?format=csv
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<byte[]> ExportTasksCsvAsync(string userId, bool isAdmin)
    {
        var tasks = await _db.Tasks
            .Include(t => t.Category)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy)
            .Where(t => isAdmin || t.CreatedByUserId == userId || t.AssignedToUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();

        // Header row
        sb.AppendLine("Id,Title,Description,Priority,Status,DueDate,Category,AssignedTo,CreatedBy,IsPrivate,CreatedAt");

        foreach (var t in tasks)
        {
            sb.AppendLine(string.Join(",",
                CsvEscape(t.Id.ToString()),
                CsvEscape(t.Title),
                CsvEscape(t.Description ?? ""),
                CsvEscape(t.Priority.ToString()),
                CsvEscape(t.Status.ToString()),
                CsvEscape(t.DueDate?.ToString("yyyy-MM-dd") ?? ""),
                CsvEscape(t.Category?.Name ?? ""),
                CsvEscape(t.AssignedTo?.Email ?? ""),
                CsvEscape(t.CreatedBy?.Email ?? ""),
                CsvEscape(t.IsPrivate.ToString()),
                CsvEscape(t.CreatedAt.ToString("yyyy-MM-dd"))
            ));
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // IMPORT — CSV
    // POST /api/tasks/import  (multipart/form-data with file field "file")
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ImportResultDTO> ImportTasksCsvAsync(
        Stream csvStream, string userId, bool isAdmin)
    {
        using var reader = new StreamReader(csvStream, Encoding.UTF8);

        var errors = new List<ImportError>();
        var toInsert = new List<Tasks>();
        int rowIndex = 0;

        // Read and discard header row
        var header = await reader.ReadLineAsync();
        if (header is null)
            return new ImportResultDTO(0, 0, errors);

        string? line;
        while ((line = await reader.ReadLineAsync()) is not null)
        {
            rowIndex++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            // Split respecting quoted fields
            var fields = SplitCsvLine(line);

            // Minimum required columns: Title, Priority, Status
            if (fields.Length < 3)
            {
                errors.Add(new ImportError(rowIndex, "Row has fewer than 3 columns"));
                continue;
            }

            var title = fields.ElementAtOrDefault(0)?.Trim() ?? "";
            var description = fields.ElementAtOrDefault(1)?.Trim();
            var priorityStr = fields.ElementAtOrDefault(2)?.Trim() ?? "";
            var statusStr = fields.ElementAtOrDefault(3)?.Trim() ?? "Todo";
            var dueDateStr = fields.ElementAtOrDefault(4)?.Trim();
            var categoryName = fields.ElementAtOrDefault(5)?.Trim();
            var assignedEmail = fields.ElementAtOrDefault(6)?.Trim();

            // ── Validate title ──────────────────────────────────────────────
            if (string.IsNullOrWhiteSpace(title))
            {
                errors.Add(new ImportError(rowIndex, "Title is required"));
                continue;
            }

            // ── Validate priority ───────────────────────────────────────────
            if (!Enum.TryParse<TaskPriority>(priorityStr, ignoreCase: true, out var priority))
            {
                errors.Add(new ImportError(rowIndex,
                    $"Invalid priority '{priorityStr}'. Valid values: Low, Medium, High, Critical"));
                continue;
            }

            // ── Validate status ─────────────────────────────────────────────
            if (!Enum.TryParse<TaskStatus>(statusStr, ignoreCase: true, out var status))
            {
                errors.Add(new ImportError(rowIndex,
                    $"Invalid status '{statusStr}'. Valid values: Todo, InProgress, OnHold, Completed, Cancelled"));
                continue;
            }

            // ── Parse optional due date ─────────────────────────────────────
            DateTime? dueDate = null;
            if (!string.IsNullOrWhiteSpace(dueDateStr))
            {
                if (!DateTime.TryParseExact(dueDateStr, "yyyy-MM-dd",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                {
                    errors.Add(new ImportError(rowIndex,
                        $"Invalid due date '{dueDateStr}'. Expected format: yyyy-MM-dd"));
                    continue;
                }
                dueDate = parsedDate;
            }

            // ── Resolve optional category by name ───────────────────────────
            Guid? categoryId = null;
            if (!string.IsNullOrWhiteSpace(categoryName))
            {
                var cat = await _db.Categories
                    .FirstOrDefaultAsync(c =>
                        c.Name.ToLower() == categoryName.ToLower() &&
                        (c.IsGlobal || c.CreatedByUserId == userId));

                if (cat is null)
                {
                    errors.Add(new ImportError(rowIndex,
                        $"Category '{categoryName}' not found. Create it first or leave blank."));
                    continue;
                }
                categoryId = cat.Id;
            }

            // ── Resolve optional assignee by email ──────────────────────────
            string? assignedToUserId = null;
            if (!string.IsNullOrWhiteSpace(assignedEmail))
            {
                var assignee = await _db.Users
                    .FirstOrDefaultAsync(u => u.Email!.ToLower() == assignedEmail.ToLower());

                if (assignee is null)
                {
                    errors.Add(new ImportError(rowIndex,
                        $"User with email '{assignedEmail}' not found. Leave blank to self-assign."));
                    continue;
                }
                assignedToUserId = assignee.Id;
            }

            // ── Build the task entity ───────────────────────────────────────
            toInsert.Add(new Tasks
            {
                Id = Guid.NewGuid(),
                Title = title,
                Description = string.IsNullOrWhiteSpace(description) ? null : description,
                Priority = priority,
                Status = status,
                DueDate = dueDate,
                CategoryId = categoryId,
                AssignedToUserId = assignedToUserId ?? userId,   // default: self-assign
                CreatedByUserId = userId,
                IsPrivate = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        // Bulk insert all valid rows then bulk-log them
        if (toInsert.Count > 0)
        {
            await _db.Tasks.AddRangeAsync(toInsert);
            await _db.SaveChangesAsync();   // tasks must exist before audit logs reference them

            var logs = toInsert.Select(t => new TaskAuditLog
            {
                Id = Guid.NewGuid(),
                TaskId = t.Id,
                UserId = userId,
                Action = "Task Created",
                OldValue = null,
                NewValue = $"Imported: {t.Title}",
                Timestamp = DateTime.UtcNow,
            });

            await _db.TaskAuditLogs.AddRangeAsync(logs);
            await _db.SaveChangesAsync();
        }

        return new ImportResultDTO(
            Imported: toInsert.Count,
            Failed: errors.Count,
            Errors: errors
        );
    }





















    //Helper to escape CSV fields
    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    /// <summary>Splits a CSV line respecting double-quoted fields.</summary>
    private static string[] SplitCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"'); i++;   // escaped quote ""
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        result.Add(current.ToString());
        return result.ToArray();
    }

}