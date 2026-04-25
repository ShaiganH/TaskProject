using Project.Model;
using Project.Service;
using Xunit;

namespace Project.Tests;

/// <summary>
/// Tests for TaskPermissionService.
/// No DB needed — all methods are pure logic checks.
/// </summary>
public class TaskPermissionServiceTests
{
    private readonly TaskPermissionService _svc = new();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static User MakeUser(string id) => new() { Id = id, FirstName = "Test", LastName = "User" };

    private static Tasks MakeTask(string createdBy, string? assignedTo = null, bool isPrivate = false, TaskStatus status = TaskStatus.Todo)
        => new()
        {
            Id               = Guid.NewGuid(),
            Title            = "Test",
            CreatedByUserId  = createdBy,
            AssignedToUserId = assignedTo ?? createdBy,
            IsPrivate        = isPrivate,
            Status           = status,
        };

    private static Category MakeCategory(string createdBy, bool isGlobal = false)
        => new() { Id = Guid.NewGuid(), Name = "Cat", CreatedByUserId = createdBy, IsGlobal = isGlobal };

    // ── CanView ───────────────────────────────────────────────────────────────

    [Fact]
    public void CanView_PublicTask_ReturnsTrue_ForAnyUser()
    {
        var user = MakeUser("stranger");
        var task = MakeTask("owner", isPrivate: false);

        Assert.True(_svc.CanView(user, task, isAdmin: false));
    }

    [Fact]
    public void CanView_PrivateTask_ReturnsFalse_ForUnrelatedUser()
    {
        var user = MakeUser("stranger");
        var task = MakeTask("owner", assignedTo: "assignee", isPrivate: true);

        Assert.False(_svc.CanView(user, task, isAdmin: false));
    }

    [Fact]
    public void CanView_PrivateTask_ReturnsTrue_ForCreator()
    {
        var user = MakeUser("owner");
        var task = MakeTask("owner", isPrivate: true);

        Assert.True(_svc.CanView(user, task, isAdmin: false));
    }

    [Fact]
    public void CanView_PrivateTask_ReturnsTrue_ForAssignee()
    {
        var user = MakeUser("assignee");
        var task = MakeTask("owner", assignedTo: "assignee", isPrivate: true);

        Assert.True(_svc.CanView(user, task, isAdmin: false));
    }

    [Fact]
    public void CanView_PrivateTask_ReturnsTrue_ForAdmin()
    {
        var user = MakeUser("admin");
        var task = MakeTask("owner", isPrivate: true);

        Assert.True(_svc.CanView(user, task, isAdmin: true));
    }

    // ── CanEdit ───────────────────────────────────────────────────────────────

    [Fact]
    public void CanEdit_ReturnsTrue_ForCreator()
    {
        var user = MakeUser("creator");
        var task = MakeTask("creator");

        Assert.True(_svc.CanEdit(user, task, isAdmin: false));
    }

    [Fact]
    public void CanEdit_ReturnsFalse_ForAssigneeWhoIsNotCreator()
    {
        var user = MakeUser("assignee");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.False(_svc.CanEdit(user, task, isAdmin: false));
    }

    [Fact]
    public void CanEdit_ReturnsTrue_ForAdmin()
    {
        var user = MakeUser("admin");
        var task = MakeTask("creator");

        Assert.True(_svc.CanEdit(user, task, isAdmin: true));
    }

    // ── CanUpdateStatus ───────────────────────────────────────────────────────

    [Fact]
    public void CanUpdateStatus_ReturnsTrue_ForAssignee()
    {
        var user = MakeUser("assignee");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.True(_svc.CanUpdateStatus(user, task, isAdmin: false));
    }

    [Fact]
    public void CanUpdateStatus_ReturnsTrue_ForCreator()
    {
        var user = MakeUser("creator");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.True(_svc.CanUpdateStatus(user, task, isAdmin: false));
    }

    [Fact]
    public void CanUpdateStatus_ReturnsFalse_ForUnrelatedUser()
    {
        var user = MakeUser("stranger");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.False(_svc.CanUpdateStatus(user, task, isAdmin: false));
    }

    // ── CanComment ────────────────────────────────────────────────────────────

    [Fact]
    public void CanComment_ReturnsTrue_ForCreator()
    {
        var user = MakeUser("creator");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.True(_svc.CanComment(user, task, isAdmin: false));
    }

    [Fact]
    public void CanComment_ReturnsFalse_ForUnrelatedUser()
    {
        var user = MakeUser("stranger");
        var task = MakeTask("creator", assignedTo: "assignee");

        Assert.False(_svc.CanComment(user, task, isAdmin: false));
    }

    // ── CanDelete ─────────────────────────────────────────────────────────────

    [Fact]
    public void CanDelete_ReturnsTrue_WhenCreatorAndTaskCompleted()
    {
        var user = MakeUser("creator");
        var task = MakeTask("creator", status: TaskStatus.Completed);

        Assert.True(_svc.CanDelete(user, task, isAdmin: false));
    }

    [Fact]
    public void CanDelete_ReturnsFalse_WhenTaskNotCompleted()
    {
        var user = MakeUser("creator");
        var task = MakeTask("creator", status: TaskStatus.InProgress);

        Assert.False(_svc.CanDelete(user, task, isAdmin: false));
    }

    [Fact]
    public void CanDelete_ReturnsFalse_ForNonCreator_EvenIfCompleted()
    {
        var user = MakeUser("stranger");
        var task = MakeTask("creator", status: TaskStatus.Completed);

        Assert.False(_svc.CanDelete(user, task, isAdmin: false));
    }

    // ── CanManageCategory ─────────────────────────────────────────────────────

    [Fact]
    public void CanManageCategory_ReturnsTrue_ForOwner()
    {
        var user = MakeUser("owner");
        var category = MakeCategory("owner", isGlobal: false);

        Assert.True(_svc.CanManageCategory(user, category, isAdmin: false));
    }

    [Fact]
    public void CanManageCategory_ReturnsFalse_ForGlobalCategory_NonAdmin()
    {
        var user = MakeUser("owner");
        var category = MakeCategory("owner", isGlobal: true);

        Assert.False(_svc.CanManageCategory(user, category, isAdmin: false));
    }

    [Fact]
    public void CanManageCategory_ReturnsTrue_ForAdmin_GlobalCategory()
    {
        var user = MakeUser("admin");
        var category = MakeCategory("someone", isGlobal: true);

        Assert.True(_svc.CanManageCategory(user, category, isAdmin: true));
    }
}