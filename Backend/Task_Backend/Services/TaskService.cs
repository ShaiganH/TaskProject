using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Exceptions;
using Project.Hubs;
using Project.Model;
using Project.Service;
using Project.StateMachine;
using Project.Utility;

namespace Project.Service;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _db;
    private readonly ITaskPermissionService _permission;
    
    private readonly IHubContext<TaskHub> _hub;
    private readonly ITaskQueryService _query;

    private readonly IAuditWriter _audit;

    public TaskService(
        ApplicationDbContext db,
        ITaskPermissionService permission,
        IHubContext<TaskHub> hub,
        ITaskQueryService query,
        IAuditWriter audit)
    {
        _db = db;
        _permission = permission;
        _hub = hub;
        _query = query;
        _audit = audit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task CreateTaskAsync(CreateTaskDTO dto, string userId)
    {
        if (dto.InitialStatus != TaskStatus.Todo && dto.InitialStatus != TaskStatus.InProgress)
            throw new InvalidArgumentException("Initial status must be Todo or InProgress");

        var assignedTo = string.IsNullOrWhiteSpace(dto.AssignedToUserId)
            ? userId
            : dto.AssignedToUserId;

        var task = new Tasks
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Description = dto.Description,
            Priority = dto.Priority,
            Status = dto.InitialStatus,
            AssignedToUserId = assignedTo,
            CreatedByUserId = userId,
            DueDate = dto.DueDate,
            CategoryId = dto.CategoryId,
            IsPrivate = dto.IsPrivate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _db.Tasks.AddAsync(task);
        await _db.SaveChangesAsync();           // save task FIRST — audit log needs its Id as FK

        await _audit.LogTaskAsync(task.Id, userId, "Task Created", null, dto.Title);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync(
            TaskEvents.TaskCreated,
            new
            {
                task.Id,
                task.Title,
                task.Status,
                task.AssignedToUserId,
                task.CreatedByUserId,
                task.DueDate
            }
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ — Dashboard  (search + filter + sort + pagination)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<PagedResult<TaskResponseDTO>> GetDashboardTasksAsync(
        string userId, bool isAdmin, TaskQueryParams q)
    {
        var query = _db.Tasks.AsQueryable();
        query = _query.ApplyBaseIncludes(query);
        query = _query.ApplyVisibility(query, userId, isAdmin);


        query = _query.ApplyFilters(query, q);
        query = _query.ApplySort(query, q.SortBy);

        return await PaginationHelper.PaginateAsync(query, q.Page, q.PageSize, TaskMapper.MapToDTO);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ — My Tasks  (search + filter + sort + pagination per section)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PagedResult<TaskResponseDTO>> GetMyTasksAsync(string userId, TaskQueryParams q)
    {
        var query = _db.Tasks.AsQueryable();

        query = _query.ApplyBaseIncludes(query);
        query = _query.ApplyVisibility(query, userId, false);

        // 🔥 Filter logic
        query = q.Filter switch
        {
            MyTaskFilter.Assigned => query.Where(t => t.AssignedToUserId == userId),
            MyTaskFilter.Created => query.Where(t => t.CreatedByUserId == userId),
            _ => query.Where(t =>
                t.AssignedToUserId == userId || t.CreatedByUserId == userId)
        };

        

        query = _query.ApplyFilters(query, q);
        query = _query.ApplySort(query, q.SortBy);

        return await PaginationHelper.PaginateAsync(query, q.Page, q.PageSize, TaskMapper.MapToDTO);
    }









    // ─────────────────────────────────────────────────────────────────────────
    // READ — Single task
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<TaskResponseDTO> GetTaskByIdAsync(Guid taskId, string userId, bool isAdmin)
    {
        var task = await _db.Tasks
            .Include(t => t.CreatedBy).Include(t => t.AssignedTo)
            .Include(t => t.Category)
            .Include(t => t.Comments).ThenInclude(c => c.User)
            .Include(t => t.AuditLogs).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new NotFoundException("Task not found");

        var user = await GetUserOrThrowAsync(userId);

        if (!_permission.CanView(user, task, isAdmin))
            throw new UnauthorizedException("You do not have permission to view this task");

        return TaskMapper.MapToDTO(task);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE — Full edit (creator / admin)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task UpdateTaskAsync(Guid taskId, UpdateTaskDTO dto, string userId, bool isAdmin)
    {
        var task = await GetTaskOrThrowAsync(taskId);
        var user = await GetUserOrThrowAsync(userId);

        if (!isAdmin && !_permission.CanEdit(user, task, isAdmin))
            throw new ForbiddenException("Only the task creator or an admin can fully edit a task");

        var oldTitle = task.Title;
        var oldDueDate = task.DueDate;
        task.Title = dto.Title.Trim();
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        task.AssignedToUserId = dto.AssignedToUserId;
        task.DueDate = dto.DueDate;
        task.CategoryId = dto.CategoryId;
        task.UpdatedAt = DateTime.UtcNow;

        await _audit.LogTaskAsync(task.Id, userId, "Task Updated", oldTitle, dto.Title);
        await _db.SaveChangesAsync();
        if (oldDueDate != task.DueDate)
        {
            await _hub.Clients.All.SendAsync(
                "TaskDueChanged",
                new
                {
                    task.Id,
                    task.DueDate,
                    task.Status,
                    task.AssignedToUserId,
                    task.CreatedByUserId
                }
            );
        }
        await _hub.Clients.All.SendAsync(
        TaskEvents.TaskUpdated,
        new
        {
            task.Id,
            task.Title,
            task.Priority,
            task.DueDate,
            task.CategoryId,
            task.AssignedToUserId
        }
        );

    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE — Status only
    // ─────────────────────────────────────────────────────────────────────────
    public async Task UpdateStatusAsync(Guid taskId, TaskStatus status, string userId, bool isAdmin)
    {
        var task = await GetTaskOrThrowAsync(taskId);
        var user = await GetUserOrThrowAsync(userId);

        if (!isAdmin && !_permission.CanUpdateStatus(user, task, isAdmin))
            throw new ForbiddenException("Only the assignee, creator, or admin can change the status");

        var oldStatus = task.Status;
        if(!StateMachineLogic.IsValidTransition(task.Status, status))
        {
            throw new InvalidArgumentException($"Invalid status transition from {task.Status} to {status}");
        }
        task.Status = status;
        task.UpdatedAt = DateTime.UtcNow;

        await _audit.LogTaskAsync(task.Id, userId, "Status Changed", oldStatus.ToString(), status.ToString());
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync(
        TaskEvents.TaskStatusUpdated,
        new
        {
            task.Id,
            task.Status,
            task.UpdatedAt
        }
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task DeleteTaskAsync(Guid taskId, string userId, bool isAdmin)
    {
        var task = await GetTaskOrThrowAsync(taskId);
        var user = await GetUserOrThrowAsync(userId);

        if (task.Status != TaskStatus.Completed)
            throw new ForbiddenException("A task can only be deleted after it is marked Completed");

        if (!isAdmin && task.CreatedByUserId != userId)
            throw new ForbiddenException("Only the task creator or an admin can delete a task");

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync(
            TaskEvents.TaskDeleted,
            taskId
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMMENT
    // ─────────────────────────────────────────────────────────────────────────
    public async Task AddCommentAsync(Guid taskId, string userId, string content, bool isAdmin)
    {
        var task = await GetTaskOrThrowAsync(taskId);
        var user = await GetUserOrThrowAsync(userId);

        if (!isAdmin && !_permission.CanComment(user, task, isAdmin))
            throw new ForbiddenException("Only the task creator, assignee, or admin can comment");

        var comment = new TaskComment
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            UserId = userId,
            Content = content.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        await _db.TaskComments.AddAsync(comment);
        await _audit.LogTaskAsync(taskId, userId, "Comment Added", null, content);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync(
        TaskEvents.TaskCommentAdded,
        new
        {
            taskId,
            comment.Id,
            comment.Content,
            comment.UserId,
            comment.CreatedAt
        }
    );
    }

    

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<Tasks> GetTaskOrThrowAsync(Guid taskId)
        => await _db.Tasks.FindAsync(taskId)
           ?? throw new NotFoundException($"Task {taskId} not found");

    private async Task<User> GetUserOrThrowAsync(string userId)
        => await _db.Users.FindAsync(userId)
           ?? throw new NotFoundException($"User {userId} not found");




}
