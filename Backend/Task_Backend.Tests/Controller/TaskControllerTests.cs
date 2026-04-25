using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Project.Controllers;
using Project.DTO;
using Project.Exceptions;
using Project.Model;
using Project.Service;
using Xunit;

namespace Project.Tests;

/// <summary>
/// Tests for TasksController.
/// The service layer is fully mocked — these tests verify HTTP status codes
/// and that the controller delegates work to the service correctly.
/// </summary>
public class TaskControllerTests
{
    private readonly Mock<ITaskService> _taskSvcMock = new();
    private readonly Mock<ITaskCsvService> _csvSvcMock = new();
    private readonly TasksController _controller;

    public TaskControllerTests()
    {
        _controller = new TasksController(_taskSvcMock.Object, _csvSvcMock.Object);

        // Simulate an authenticated user with id "user-1" and role "User"
        SetUser("user-1", "User");
    }

    // ── Setup helpers ─────────────────────────────────────────────────────────

    private void SetUser(string userId, string role)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Role, role),
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static TaskResponseDTO FakeTaskResponse(Guid? id = null) => new(
        Id: id ?? Guid.NewGuid(),
        Title: "Test Task",
        Description: null,
        Priority: TaskPriority.Low,
        Status: TaskStatus.Todo,
        DueDate: null,
        CreatedAt: DateTime.UtcNow,
        UpdatedAt: DateTime.UtcNow,
        IsPrivate: false,
        CreatedByUserId: "user-1",
        CreatedByName: "Test User",
        AssignedToUserId: "user-1",
        AssignedToName: "Test User",
        CategoryId: null,
        CategoryName: null,
        CategoryColor: null,
        CommentCount: 0,
        Comments: [],
        AuditLogs: []
    );

    // ── GET /dashboard ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboard_Returns200_WithResults()
    {


        var paged = new PagedResult<TaskResponseDTO>(
    Items: new[] { FakeTaskResponse() },
    TotalCount: 1,
    Page: 1,
    PageSize: 10,
    TotalPages: 1
);

        _taskSvcMock
            .Setup(s => s.GetDashboardTasksAsync("user-1", false, It.IsAny<TaskQueryParams>()))
            .ReturnsAsync(paged);

        var result = await _controller.GetDashboard(new TaskQueryParams()) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    // ── GET /{id} ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Returns200_WhenTaskExists()
    {
        var taskId = Guid.NewGuid();
        _taskSvcMock
            .Setup(s => s.GetTaskByIdAsync(taskId, "user-1", false))
            .ReturnsAsync(FakeTaskResponse(taskId));

        var result = await _controller.GetById(taskId) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetById_BubblesUp_NotFoundException()
    {
        var taskId = Guid.NewGuid();
        _taskSvcMock
            .Setup(s => s.GetTaskByIdAsync(taskId, "user-1", false))
            .ThrowsAsync(new NotFoundException("Task not found"));

        await Assert.ThrowsAsync<NotFoundException>(() => _controller.GetById(taskId));
    }

    // ── POST / ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Returns201_WhenSuccessful()
    {
        var dto = new CreateTaskDTO("New Task", null, TaskPriority.Low, TaskStatus.Todo, null, null, null);
        _taskSvcMock
            .Setup(s => s.CreateTaskAsync(dto, "user-1"))
            .Returns(Task.CompletedTask);

        var result = await _controller.Create(dto) as ObjectResult;

        Assert.NotNull(result);
        Assert.Equal(201, result.StatusCode);
    }

    [Fact]
    public async Task Create_BubblesUp_InvalidArgumentException()
    {
        var dto = new CreateTaskDTO("Bad", null, TaskPriority.Low, TaskStatus.Completed, null, null, null);
        _taskSvcMock
            .Setup(s => s.CreateTaskAsync(dto, "user-1"))
            .ThrowsAsync(new InvalidArgumentException("Bad status"));

        await Assert.ThrowsAsync<InvalidArgumentException>(() => _controller.Create(dto));
    }

    // ── PUT /{id} ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_Returns204_WhenSuccessful()
    {
        var taskId = Guid.NewGuid();
        var dto = new UpdateTaskDTO("Updated", null, TaskPriority.Medium, null, null, null);

        _taskSvcMock
            .Setup(s => s.UpdateTaskAsync(taskId, dto, "user-1", false))
            .Returns(Task.CompletedTask);

        var result = await _controller.Update(taskId, dto) as NoContentResult;

        Assert.NotNull(result);
        Assert.Equal(204, result.StatusCode);
    }

    // ── PATCH /{id}/status ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_Returns204_WhenSuccessful()
    {
        var taskId = Guid.NewGuid();
        var dto = new UpdateStatusDTO(TaskStatus.InProgress);

        _taskSvcMock
            .Setup(s => s.UpdateStatusAsync(taskId, TaskStatus.InProgress, "user-1", false))
            .Returns(Task.CompletedTask);

        var result = await _controller.UpdateStatus(taskId, dto) as NoContentResult;

        Assert.NotNull(result);
        Assert.Equal(204, result.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_BubblesUp_ForbiddenException()
    {
        var taskId = Guid.NewGuid();
        var dto = new UpdateStatusDTO(TaskStatus.InProgress);

        _taskSvcMock
            .Setup(s => s.UpdateStatusAsync(taskId, TaskStatus.InProgress, "user-1", false))
            .ThrowsAsync(new ForbiddenException("Not allowed"));

        await Assert.ThrowsAsync<ForbiddenException>(() => _controller.UpdateStatus(taskId, dto));
    }

    // ── DELETE /{id} ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns204_WhenSuccessful()
    {
        var taskId = Guid.NewGuid();
        _taskSvcMock
            .Setup(s => s.DeleteTaskAsync(taskId, "user-1", false))
            .Returns(Task.CompletedTask);

        var result = await _controller.Delete(taskId) as NoContentResult;

        Assert.NotNull(result);
        Assert.Equal(204, result.StatusCode);
    }

    [Fact]
    public async Task Delete_BubblesUp_ForbiddenException_WhenTaskNotCompleted()
    {
        var taskId = Guid.NewGuid();
        _taskSvcMock
            .Setup(s => s.DeleteTaskAsync(taskId, "user-1", false))
            .ThrowsAsync(new ForbiddenException("Task must be completed first"));

        await Assert.ThrowsAsync<ForbiddenException>(() => _controller.Delete(taskId));
    }

    // ── Admin role ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_AdminCanDelete_PassesIsAdminTrue()
    {
        SetUser("admin-1", "Admin");

        var taskId = Guid.NewGuid();
        _taskSvcMock
            .Setup(s => s.DeleteTaskAsync(taskId, "admin-1", true))
            .Returns(Task.CompletedTask);

        var result = await _controller.Delete(taskId) as NoContentResult;

        Assert.NotNull(result);
        // Verify the service was called with isAdmin=true
        _taskSvcMock.Verify(s => s.DeleteTaskAsync(taskId, "admin-1", true), Times.Once);
    }

    // ── POST /{id}/comments ───────────────────────────────────────────────────

    [Fact]
    public async Task AddComment_Returns201_WhenSuccessful()
    {
        var taskId = Guid.NewGuid();
        var dto = new AddCommentDTO("Great work!");

        _taskSvcMock
            .Setup(s => s.AddCommentAsync(taskId, "user-1", "Great work!", false))
            .Returns(Task.CompletedTask);

        var result = await _controller.AddComment(taskId, dto) as ObjectResult;

        Assert.NotNull(result);
        Assert.Equal(201, result.StatusCode);
    }
}