using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.DTO;
using Project.Service;
using System.Security.Claims;

namespace Project.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
        => _auditLogService = auditLogService;

    private string CurrentUserId  => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool   CurrentIsAdmin => User.IsInRole("Admin");

    // GET /api/audit-logs?action=StatusChanged&search=login&page=1&pageSize=20
    // Regular users: their own logs only.
    // Admins: all logs from all users.
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] AuditQueryParams query)
    {
        var result = await _auditLogService.GetLogsAsync(
            CurrentUserId, CurrentIsAdmin, query);
        return Ok(result);
    }
}
