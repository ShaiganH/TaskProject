using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.DTO;
using Project.Model;
using Project.Service;
using System.Security.Claims;

namespace Project.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ITaskCsvService _csvService;

    public TasksController(ITaskService taskService, ITaskCsvService csvService) { _taskService = taskService; _csvService = csvService; }

    private string CurrentUserId  => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool   CurrentIsAdmin => User.IsInRole("Admin");

    // ── GET /api/tasks/dashboard?search=&status=&priority=&categoryId=&sortBy=&page=&pageSize=
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] TaskQueryParams query)
    {
        var result = await _taskService.GetDashboardTasksAsync(
            CurrentUserId, CurrentIsAdmin, query);
        return Ok(result);
    }

    // ── GET /api/tasks/my?search=&status=&priority=&sortBy=&page=&pageSize=
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTasks([FromQuery] TaskQueryParams query)
    {
        var result = await _taskService.GetMyTasksAsync(CurrentUserId, query);
        return Ok(result);
    }

    // ── GET /api/tasks/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
         return Ok(await _taskService.GetTaskByIdAsync(id, CurrentUserId, CurrentIsAdmin)); 
    }

    // ── POST /api/tasks
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        
            await _taskService.CreateTaskAsync(dto, CurrentUserId);
            return StatusCode(201, "Task created");
    }

    // ── PUT /api/tasks/{id}   — full edit, creator/admin only
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        
            await _taskService.UpdateTaskAsync(id, dto, CurrentUserId, CurrentIsAdmin);
            return NoContent();
    }

    // ── PATCH /api/tasks/{id}/status  — assignee or creator or admin
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDTO dto)
    {
        
            await _taskService.UpdateStatusAsync(id, dto.Status, CurrentUserId, CurrentIsAdmin);
            return NoContent();
    }

    // ── DELETE /api/tasks/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        
            await _taskService.DeleteTaskAsync(id, CurrentUserId, CurrentIsAdmin);
            return NoContent();
    }

    // ── POST /api/tasks/{id}/comments
    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddCommentDTO dto)
    {
            await _taskService.AddCommentAsync(id, CurrentUserId, dto.Content, CurrentIsAdmin);
            return StatusCode(201, "Comment added");
    }

    // ── GET /api/tasks/export?format=csv
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string format = "csv")
    {
        if (!format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only CSV export is supported. Use ?format=csv");

        var bytes = await _csvService.ExportTasksCsvAsync(CurrentUserId, CurrentIsAdmin);

        var fileName = $"tasks-{DateTime.UtcNow:yyyy-MM-dd}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    // ── POST /api/tasks/import   (multipart/form-data, field name: "file")
    [HttpPost("import")]
    [RequestSizeLimit(10 * 1024 * 1024)]   // 10 MB max upload
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided. Upload a CSV with the field name 'file'.");

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .csv files are accepted");

        await using var stream = file.OpenReadStream();
        var result = await _csvService.ImportTasksCsvAsync(stream, CurrentUserId, CurrentIsAdmin);

        // Return 207 Multi-Status if some rows failed — caller can inspect the error list
        var statusCode = result.Failed > 0 ? 207 : 201;
        return StatusCode(statusCode, result);
    }
}
