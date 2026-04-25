using Microsoft.AspNetCore.SignalR;
using Moq;
using Project.Data;
using Project.DTO;
using Project.Exceptions;
using Project.Hubs;
using Project.Model;
using Project.Service;
using Project.StateMachine;
using Xunit;

namespace Project.Tests;

/// <summary>
/// Tests for TaskService using an in-memory database.
/// Dependencies like IHubContext and IAuditWriter are mocked.
/// </summary>
public class TaskServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly TaskService _svc;

    // Mocks
    private readonly Mock<ITaskPermissionService> _permissionMock = new();
    private readonly Mock<IHubContext<TaskHub>>   _hubMock        = new();
    private readonly Mock<ITaskQueryService>      _queryMock      = new();
    private readonly Mock<IAuditWriter>           _auditMock      = new();
    private readonly Mock<IClientProxy>           _clientProxy    = new();

    public TaskServiceTests()
    {
        _db = TestDbContextFactory.Create();

        // Hub setup — silence SendAsync so tests don't crash on SignalR calls
        var clients = new Mock<IHubClients>();
        clients.Setup(c => c.All).Returns(_clientProxy.Object);
        _hubMock.Setup(h => h.Clients).Returns(clients.Object);
        _clientProxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // AuditWriter — no-op
        _auditMock
            .Setup(a => a.LogTaskAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        _svc = new TaskService(_db, _permissionMock.Object, _hubMock.Object, _queryMock.Object, _auditMock.Object);
    }

    public void Dispose() => _db.Dispose();

    // ── CreateTask ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTask_SavesTask_WhenStatusIsTodo()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        var dto = new CreateTaskDTO("My Task", null, TaskPriority.Low, TaskStatus.Todo, null, null, null);

        await _svc.CreateTaskAsync(dto, "user-1");

        var saved = _db.Tasks.Single();
        Assert.Equal("My Task", saved.Title);
        Assert.Equal(TaskStatus.Todo, saved.Status);
        Assert.Equal("user-1", saved.CreatedByUserId);
    }

    [Fact]
    public async Task CreateTask_SavesTask_WhenStatusIsInProgress()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        var dto = new CreateTaskDTO("Task B", null, TaskPriority.High, TaskStatus.InProgress, null, null, null);
        await _svc.CreateTaskAsync(dto, "user-1");

        Assert.Equal(TaskStatus.InProgress, _db.Tasks.Single().Status);
    }

    [Fact]
    public async Task CreateTask_Throws_WhenInitialStatusIsCompleted()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        var dto = new CreateTaskDTO("Bad Task", null, TaskPriority.Low, TaskStatus.Completed, null, null, null);

        await Assert.ThrowsAsync<InvalidArgumentException>(() => _svc.CreateTaskAsync(dto, "user-1"));
    }

    [Fact]
    public async Task CreateTask_AssignsToSelf_WhenNoAssigneeProvided()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        var dto = new CreateTaskDTO("Self Task", null, TaskPriority.Low, TaskStatus.Todo, null, null, null);
        await _svc.CreateTaskAsync(dto, "user-1");

        Assert.Equal("user-1", _db.Tasks.Single().AssignedToUserId);
    }

    [Fact]
    public async Task CreateTask_UsesProvidedAssignee()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        TestDbContextFactory.SeedUser(_db, "user-2");

        var dto = new CreateTaskDTO("Team Task", null, TaskPriority.Low, TaskStatus.Todo, "user-2", null, null);
        await _svc.CreateTaskAsync(dto, "user-1");

        Assert.Equal("user-2", _db.Tasks.Single().AssignedToUserId);
    }

    [Fact]
    public async Task CreateTask_TrimsTitle_BeforeSaving()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        var dto = new CreateTaskDTO("  Padded Title  ", null, TaskPriority.Low, TaskStatus.Todo, null, null, null);
        await _svc.CreateTaskAsync(dto, "user-1");

        Assert.Equal("Padded Title", _db.Tasks.Single().Title);
    }

    // ── UpdateStatus ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_ChangesStatus_WhenTransitionIsValid()
    {
        var user = TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Todo);

        _permissionMock
            .Setup(p => p.CanUpdateStatus(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(true);

        await _svc.UpdateStatusAsync(task.Id, TaskStatus.InProgress, "user-1", false);

        var updated = await _db.Tasks.FindAsync(task.Id);
        Assert.Equal(TaskStatus.InProgress, updated!.Status);
    }

    [Fact]
    public async Task UpdateStatus_Throws_WhenTransitionIsInvalid()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Todo);

        _permissionMock
            .Setup(p => p.CanUpdateStatus(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(true);

        // Todo → Completed is not a valid transition
        await Assert.ThrowsAsync<InvalidArgumentException>(
            () => _svc.UpdateStatusAsync(task.Id, TaskStatus.Completed, "user-1", false));
    }

    [Fact]
    public async Task UpdateStatus_Throws_WhenUserHasNoPermission()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Todo);

        _permissionMock
            .Setup(p => p.CanUpdateStatus(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(false);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _svc.UpdateStatusAsync(task.Id, TaskStatus.InProgress, "user-1", false));
    }

    [Fact]
    public async Task UpdateStatus_Throws_WhenTaskDoesNotExist()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        await Assert.ThrowsAsync<NotFoundException>(
            () => _svc.UpdateStatusAsync(Guid.NewGuid(), TaskStatus.InProgress, "user-1", false));
    }

    // ── DeleteTask ────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteTask_RemovesTask_WhenCompletedAndCreator()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Completed);

        await _svc.DeleteTaskAsync(task.Id, "user-1", false);

        Assert.Empty(_db.Tasks);
    }

    [Fact]
    public async Task DeleteTask_Throws_WhenTaskNotCompleted()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.InProgress);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _svc.DeleteTaskAsync(task.Id, "user-1", false));
    }

    [Fact]
    public async Task DeleteTask_Throws_WhenNonCreatorTriesToDelete()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        TestDbContextFactory.SeedUser(_db, "user-2");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Completed);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _svc.DeleteTaskAsync(task.Id, "user-2", false));
    }

    [Fact]
    public async Task DeleteTask_AdminCanDelete_AnyCompletedTask()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        TestDbContextFactory.SeedUser(_db, "admin-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1", status: TaskStatus.Completed);

        await _svc.DeleteTaskAsync(task.Id, "admin-1", true);

        Assert.Empty(_db.Tasks);
    }

    // ── AddComment ────────────────────────────────────────────────────────────

    [Fact]
    public async Task AddComment_SavesComment_WhenUserIsAllowed()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        var task = TestDbContextFactory.SeedTask(_db, "user-1");

        _permissionMock
            .Setup(p => p.CanComment(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(true);

        await _svc.AddCommentAsync(task.Id, "user-1", "  Nice work!  ", false);

        var comment = _db.TaskComments.Single();
        Assert.Equal("Nice work!", comment.Content);   // trimmed
        Assert.Equal("user-1", comment.UserId);
    }

    [Fact]
    public async Task AddComment_Throws_WhenUserIsNotAllowed()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");
        TestDbContextFactory.SeedUser(_db, "stranger");
        var task = TestDbContextFactory.SeedTask(_db, "user-1");

        _permissionMock
            .Setup(p => p.CanComment(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(false);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _svc.AddCommentAsync(task.Id, "stranger", "Sneaky comment", false));
    }

    // ── GetTaskById ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTaskById_Throws_WhenTaskDoesNotExist()
    {
        TestDbContextFactory.SeedUser(_db, "user-1");

        await Assert.ThrowsAsync<NotFoundException>(
            () => _svc.GetTaskByIdAsync(Guid.NewGuid(), "user-1", false));
    }

    [Fact]
    public async Task GetTaskById_Throws_WhenUserCannotView()
    {
        TestDbContextFactory.SeedUser(_db, "owner");
        TestDbContextFactory.SeedUser(_db, "stranger");
        var task = TestDbContextFactory.SeedTask(_db, "owner", isPrivate: true);

        _permissionMock
            .Setup(p => p.CanView(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(false);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => _svc.GetTaskByIdAsync(task.Id, "stranger", false));
    }

    // ── UpdateTask ────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTask_Throws_WhenNonCreatorTriesToEdit()
    {
        TestDbContextFactory.SeedUser(_db, "creator");
        TestDbContextFactory.SeedUser(_db, "assignee");
        var task = TestDbContextFactory.SeedTask(_db, "creator", assignedToUserId: "assignee");

        _permissionMock
            .Setup(p => p.CanEdit(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(false);

        var dto = new UpdateTaskDTO("New Title", null, TaskPriority.Low, null, null, null);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _svc.UpdateTaskAsync(task.Id, dto, "assignee", false));
    }

    [Fact]
    public async Task UpdateTask_UpdatesFields_WhenCreator()
    {
        TestDbContextFactory.SeedUser(_db, "creator");
        var task = TestDbContextFactory.SeedTask(_db, "creator");

        _permissionMock
            .Setup(p => p.CanEdit(It.IsAny<User>(), It.IsAny<Tasks>(), false))
            .Returns(true);

        var dto = new UpdateTaskDTO("Updated Title", "New desc", TaskPriority.High, null, null, null);
        await _svc.UpdateTaskAsync(task.Id, dto, "creator", false);

        var updated = await _db.Tasks.FindAsync(task.Id);
        Assert.Equal("Updated Title", updated!.Title);
        Assert.Equal(TaskPriority.High, updated.Priority);
    }
}