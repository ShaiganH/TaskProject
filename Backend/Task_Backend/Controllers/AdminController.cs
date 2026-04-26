using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Exceptions;
using Project.Hubs;
using Project.Model;
using Project.Service;

namespace Project.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<TaskHub> _hub;
    private readonly IAuthService _authService;

    public AdminController(UserManager<User> userManager, ApplicationDbContext db, IHubContext<TaskHub> hub, IAuthService authService)
    {
        _userManager = userManager;
        _db = db;
        _hub = hub;
        _authService = authService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ─────────────────────────────────────────────────────────────
    // GET /api/admin/users  — all users with task stats
    // ─────────────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users.ToListAsync();

        var roles     = await _db.Roles.ToListAsync();
        var userRoles = await _db.UserRoles.ToListAsync();

        var taskStats = await _db.Tasks
            .GroupBy(t => t.AssignedToUserId)
            .Select(g => new
            {
                UserId     = g.Key,
                Total      = g.Count(),
                InProgress = g.Count(x => x.Status == TaskStatus.InProgress),
                Completed  = g.Count(x => x.Status == TaskStatus.Completed),
                Overdue    = g.Count(x => x.DueDate < DateTime.UtcNow && x.Status != TaskStatus.Completed && x.Status != TaskStatus.Cancelled)
            })
            .ToListAsync();

        var userRoleMap   = userRoles.GroupBy(ur => ur.UserId)
                                     .ToDictionary(g => g.Key, g => g.Select(x => x.RoleId).ToList());
        var taskStatsDict = taskStats.ToDictionary(x => x.UserId);

        var result = users.Select(u =>
        {
            var roleIds   = userRoleMap.GetValueOrDefault(u.Id, new List<string>());
            var roleNames = roles.Where(r => roleIds.Contains(r.Id)).Select(r => r.Name).ToList();
            var stats     = taskStatsDict.GetValueOrDefault(u.Id);

            return new
            {
                id          = u.Id,
                email       = u.Email,
                firstName   = u.FirstName,
                lastName    = u.LastName,
                designation = u.Designation,
                role        = roleNames.FirstOrDefault() ?? "User",
                isBlocked   = u.LockoutEnd != null && u.LockoutEnd > DateTimeOffset.UtcNow,
                createdAt   = u.CreatedAt,
                profilePictureUrl = u.ProfilePictureUrl,
                taskStats   = new
                {
                    total      = stats?.Total      ?? 0,
                    inProgress = stats?.InProgress ?? 0,
                    completed  = stats?.Completed  ?? 0,
                    overdue    = stats?.Overdue    ?? 0,
                }
            };
        });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/admin/stats  — system-wide numbers
    // ─────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _userManager.Users.CountAsync();
        var totalTasks = await _db.Tasks.CountAsync();
        var completed  = await _db.Tasks.CountAsync(t => t.Status == TaskStatus.Completed);
        var overdue    = await _db.Tasks.CountAsync(t =>
            t.DueDate < DateTime.UtcNow &&
            t.Status != TaskStatus.Completed &&
            t.Status != TaskStatus.Cancelled);

        var byStatus   = await _db.Tasks.GroupBy(t => t.Status)
            .Select(g => new { Key = g.Key.ToString(), Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var byPriority = await _db.Tasks.GroupBy(t => t.Priority)
            .Select(g => new { Key = g.Key.ToString(), Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        return Ok(new
        {
            totalUsers,
            totalTasks,
            completedTasks = completed,
            overdueTasks   = overdue,
            tasksByStatus   = byStatus,
            tasksByPriority = byPriority,
        });
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/admin/activity  — last 50 audit log entries
    // ─────────────────────────────────────────────────────────────
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity()
    {
        var logs = await _db.TaskAuditLogs
            .Include(a => a.User)
            .Include(a => a.Task)
            .OrderByDescending(a => a.Timestamp)
            .Take(50)
            .Select(a => new
            {
                id        = a.Id,
                userId    = a.UserId,
                userName  = a.User.FirstName + " " + a.User.LastName,
                taskId    = a.TaskId,
                taskTitle = a.Task != null ? a.Task.Title : null,
                action    = a.Action,
                oldValue  = a.OldValue,
                newValue  = a.NewValue,
                timestamp = a.Timestamp,
            })
            .ToListAsync();

        return Ok(logs);
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /api/admin/users/{id}/block  — toggle block/unblock
    // ─────────────────────────────────────────────────────────────
    [HttpPatch("users/{id}/block")]
    public async Task<IActionResult> ToggleBlock(string id)
    {
        if (id == CurrentUserId)
            throw new ForbiddenException("You cannot block yourself.");

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        // Ensure LockoutEnabled is on so the lockout date is respected on login
        await _userManager.SetLockoutEnabledAsync(user, true);

        var isBlocked = user.LockoutEnd != null && user.LockoutEnd > DateTimeOffset.UtcNow;

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
            throw new ForbiddenException("Cannot block another admin.");

        if (isBlocked)
        {
            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);
            

            
            
        }
        else
        {
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);

            await _authService.LogoutAllDevices(user.Id);  // invalidate all tokens so the block takes effect immediately

            // 2. IMPORTANT: Update Security Stamp
            // This invalidates the current Access Token/Session immediately 
            // if your Auth setup is configured to check it.
            await _userManager.UpdateSecurityStampAsync(user);
        }

        // Broadcast so admin UI updates in real-time
        await _hub.Clients.All.SendAsync("UserBlocked", new { userId = id, blocked = !isBlocked });

        return Ok(new { blocked = !isBlocked });
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /api/admin/users/{id}/name
    // ─────────────────────────────────────────────────────────────
    [HttpPatch("users/{id}/name")]
    public async Task<IActionResult> UpdateName(string id, [FromBody] UpdateNameDTO dto)
    {
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        user.FirstName = dto.FirstName.Trim();
        user.LastName  = dto.LastName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new BadReqException(string.Join(", ", result.Errors.Select(e => e.Description)));

        await _hub.Clients.All.SendAsync("UserUpdated", new
        {
            userId      = id,
            firstName   = user.FirstName,
            lastName    = user.LastName,
            designation = user.Designation,
        });

        return Ok(new { firstName = user.FirstName, lastName = user.LastName });
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /api/admin/users/{id}/designation
    // ─────────────────────────────────────────────────────────────
    [HttpPatch("users/{id}/designation")]
    public async Task<IActionResult> UpdateDesignation(string id, [FromBody] UpdateDesignationDTO dto)
    {
        var allowed = new[] { "Intern", "Junior Developer", "Senior Developer", "Team Lead" };
        if (!allowed.Contains(dto.Designation))
            throw new InvalidArgumentException($"Invalid designation. Allowed: {string.Join(", ", allowed)}");

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        user.Designation = dto.Designation;
        user.UpdatedAt   = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new BadReqException(string.Join(", ", result.Errors.Select(e => e.Description)));

        await _hub.Clients.All.SendAsync("UserUpdated", new
        {
            userId      = id,
            firstName   = user.FirstName,
            lastName    = user.LastName,
            designation = user.Designation,
        });

        return Ok(new { designation = user.Designation });
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /api/admin/tasks/{id}  — admin edits any task field
    // ─────────────────────────────────────────────────────────────
    [HttpPatch("tasks/{id:guid}")]
    public async Task<IActionResult> EditTask(Guid id, [FromBody] AdminEditTaskDTO dto)
    {
        var task = await _db.Tasks.FindAsync(id)
            ?? throw new NotFoundException("Task not found.");

        var changed = new List<string>();

        if (dto.Title is not null && dto.Title.Trim() != task.Title)
        {
            task.Title = dto.Title.Trim();
            changed.Add("title");
        }

        if (dto.Description is not null)
            task.Description = dto.Description;

        if (dto.Priority is not null && dto.Priority != task.Priority)
        {
            task.Priority = dto.Priority.Value;
            changed.Add("priority");
        }

        if (dto.DueDate != task.DueDate)
        {
            task.DueDate = dto.DueDate;
            changed.Add("dueDate");
        }

        if (dto.AssignedToUserId is not null && dto.AssignedToUserId != task.AssignedToUserId)
        {
            task.AssignedToUserId = dto.AssignedToUserId;
            changed.Add("assignedTo");
        }

        if (dto.CategoryId != task.CategoryId)
            task.CategoryId = dto.CategoryId;

        task.UpdatedAt = DateTime.UtcNow;

        // Log each meaningful change
        foreach (var field in changed)
        {
            _db.TaskAuditLogs.Add(new TaskAuditLog
            {
                Id        = Guid.NewGuid(),
                TaskId    = task.Id,
                UserId    = CurrentUserId,
                Action    = "Task Updated",
                OldValue  = field,
                NewValue  = field == "priority" ? dto.Priority.ToString()
                           : field == "dueDate"  ? dto.DueDate?.ToString("yyyy-MM-dd")
                           : field == "title"    ? dto.Title
                           : dto.AssignedToUserId,
                Timestamp = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        // Broadcast update so all clients (including the task owner) see changes
        await _hub.Clients.All.SendAsync("TaskUpdated", new
        {
            id                 = task.Id,
            title              = task.Title,
            description        = task.Description,
            priority           = task.Priority.ToString(),
            dueDate            = task.DueDate,
            assignedToUserId   = task.AssignedToUserId,
            categoryId         = task.CategoryId,
            updatedAt          = task.UpdatedAt,
        });

        return Ok(new { message = "Task updated by admin." });
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/admin/categories  — create a global category
    // ─────────────────────────────────────────────────────────────
    [HttpPost("categories")]
    public async Task<IActionResult> CreateGlobalCategory([FromBody] CreateGlobalCategoryDTO dto)
    {
        var name = dto.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidArgumentException("Category name is required.");

        var exists = await _db.Categories
            .AnyAsync(c => c.Name.ToLower() == name.ToLower() && c.IsGlobal);

        if (exists)
            throw new BadReqException("A global category with this name already exists.");

        var category = new Category
        {
            Id              = Guid.NewGuid(),
            Name            = name,
            Color           = dto.Color ?? "#3b82f6",
            CreatedByUserId = CurrentUserId,
            IsGlobal        = true,
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        var payload = new
        {
            id              = category.Id,
            name            = category.Name,
            color           = category.Color,
            isGlobal        = category.IsGlobal,
            createdByUserId = category.CreatedByUserId,
            taskCount       = 0,
        };

        await _hub.Clients.All.SendAsync("CategoryCreated", payload);

        return StatusCode(201, payload);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/admin/categories/{id}  — delete any category
    // ─────────────────────────────────────────────────────────────
    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var category = await _db.Categories.FindAsync(id)
            ?? throw new NotFoundException("Category not found.");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("CategoryDeleted", id);

        return NoContent();
    }
}