using Project.Model;

namespace Project.Service;

/// <summary>
/// Central authority for all task-level permission checks.
/// Inject this anywhere you need to guard an action.
/// </summary>
public class TaskPermissionService : ITaskPermissionService
{
    // ─── Role check ──────────────────────────────────────────────────────────
    /// <summary>
    /// Uses the Role property set by ASP.NET Identity — NOT a username string.
    /// In your controller extract the role from the JWT claim and store it on User,
    /// or pass it from ClaimsPrincipal directly.
    /// </summary>

    public bool IsAdmin(bool isAdmin) => isAdmin;

    // ─── Task permissions ────────────────────────────────────────────────────

    /// <summary>
    /// Dashboard rule: private tasks are visible only to creator, assignee, or admin.
    /// Public tasks are visible to everyone.
    /// </summary>
    public bool CanView(User user, Tasks task,bool isAdmin)
    {
        if (!task.IsPrivate) return true;

        return task.CreatedByUserId == user.Id ||
           task.AssignedToUserId == user.Id ||
           isAdmin;
    }

    /// <summary>
    /// Only creator (assignor) or assignee can post comments.
    /// Admins can always comment.
    /// </summary>
    public bool CanComment(User user, Tasks task,bool isAdmin)
        => task.CreatedByUserId == user.Id ||
           task.AssignedToUserId == user.Id ||
           isAdmin;

    /// <summary>
    /// Assignor (creator) can change priority, status, and due date.
    /// Assignee can only change status (enforced at the service call-site — not here,
    /// because this method only answers "can they update status at all").
    /// Admin can do everything.
    /// </summary>
    public bool CanUpdateStatus(User user, Tasks task,bool isAdmin)
        => task.AssignedToUserId == user.Id ||
           task.CreatedByUserId == user.Id ||
           isAdmin;

    /// <summary>
    /// Full edit (title, description, priority, due date, assignee, category)
    /// is restricted to the creator and admins.
    /// Assignees who are NOT the creator can only change status — use CanUpdateStatus for that.
    /// </summary>
    public bool CanEdit(User user, Tasks task,bool isAdmin)
        => task.CreatedByUserId == user.Id || isAdmin;

    /// <summary>
    /// Deletion requires the task to be Completed first.
    /// Only the creator or admin may delete.
    /// </summary>
    public bool CanDelete(User user, Tasks task,bool isAdmin)
        => task.Status == TaskStatus.Completed &&
           (task.CreatedByUserId == user.Id || isAdmin);

    // ─── Category permissions ────────────────────────────────────────────────

    /// <summary>
    /// A user can manage (edit/delete) a category if they created it, or if they are admin.
    /// Global categories can only be managed by admins.
    /// </summary>
    public bool CanManageCategory(User user, Category category,bool isAdmin)
    {
        if (isAdmin) return true;
        if (category.IsGlobal) return false;          // only admin touches global cats
        return category.CreatedByUserId == user.Id;
    }
}
