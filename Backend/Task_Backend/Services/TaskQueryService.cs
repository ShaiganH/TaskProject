using Microsoft.EntityFrameworkCore;
using Project.DTO;
using Project.Model;

namespace Project.Service;

public class TaskQueryService:ITaskQueryService
{
    public IQueryable<Tasks> ApplyBaseIncludes(IQueryable<Tasks> query)
    {
        return query
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .Include(t => t.Category)
            .Include(t => t.Comments).ThenInclude(c => c.User)
            .Include(t => t.AuditLogs).ThenInclude(a => a.User);
    }

    public IQueryable<Tasks> ApplyVisibility(
        IQueryable<Tasks> query, string userId, bool isAdmin)
    {
        return query.Where(t =>
            !t.IsPrivate ||
            isAdmin ||
            t.CreatedByUserId == userId ||
            t.AssignedToUserId == userId
        );
    }

    public IQueryable<Tasks> ApplySort(
        IQueryable<Tasks> query, TaskSortBy sortBy) => sortBy switch
        {
            TaskSortBy.DueDateEarliest => query.OrderBy(t =>
                                              t.DueDate == null ? DateTime.MaxValue : t.DueDate),
            TaskSortBy.DueDateLatest => query.OrderByDescending(t =>
                                              t.DueDate == null ? DateTime.MinValue : t.DueDate),
            TaskSortBy.PriorityHighest => query.OrderBy(t =>
    t.Priority == TaskPriority.Critical ? 0 :
    t.Priority == TaskPriority.High ? 1 :
    t.Priority == TaskPriority.Medium ? 2 : 3),
            TaskSortBy.OldestFirst => query.OrderBy(t => t.CreatedAt),
            _ => query.OrderByDescending(t => t.CreatedAt), // NewestFirst
        };




    public IQueryable<Tasks> ApplyFilters(
        IQueryable<Tasks> query, TaskQueryParams q)
    {
        // Text search — title or description
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(s) ||
                (t.Description != null && t.Description.ToLower().Contains(s)));
        }

        if (q.Status.HasValue)
            query = query.Where(t => t.Status == q.Status.Value);

        if (q.Priority.HasValue)
            query = query.Where(t => t.Priority == q.Priority.Value);

        if (q.CategoryId.HasValue)
            query = query.Where(t => t.CategoryId == q.CategoryId.Value);

        return query;
    }








}