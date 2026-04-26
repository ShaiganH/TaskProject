using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.Exceptions;
using Project.Model;

namespace Project.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _db;

    public UserController(UserManager<User> userManager, ApplicationDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ─────────────────────────────────────────────────────────────
    // GET /api/users  — lightweight list for dropdowns & task panels
    // Returns only non-admin users. Role is NOT exposed.
    // ─────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Fetch all users
        var users = await _userManager.Users
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.ProfilePictureUrl,
                u.Designation,
                u.CreatedAt,
            })
            .ToListAsync();

        // Filter out admins so regular users never see admin accounts
        var adminUserIds = (await _db.UserRoles
            .Join(_db.Roles.Where(r => r.Name == "Admin"),
                  ur => ur.RoleId, r => r.Id, (ur, r) => ur.UserId)
            .ToListAsync())
            .ToHashSet();

        var currentIsAdmin = User.IsInRole("Admin");

        var result = users
            .Where(u => currentIsAdmin || !adminUserIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.ProfilePictureUrl,
                u.Designation,
                u.CreatedAt,
            });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/users/{id}/profile  — public profile for any user
    // Regular users cannot view admin profiles.
    // Admins CAN view anyone (needed for admin panel).
    // Role is NOT returned to non-admin callers.
    // ─────────────────────────────────────────────────────────────
    [HttpGet("{id}/profile")]
    public async Task<IActionResult> GetProfile(string id)
    {
        var currentIsAdmin = User.IsInRole("Admin");

        var targetUser = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        var targetRoles = await _userManager.GetRolesAsync(targetUser);
        var isTargetAdmin = targetRoles.Contains("Admin");

        // Block non-admins from viewing admin profiles
        if (!currentIsAdmin && isTargetAdmin)
            throw new ForbiddenException("You cannot view an admin profile.");

        // Count tasks for profile stats
        var taskStats = await _db.Tasks
            .Where(t => t.AssignedToUserId == id)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total      = g.Count(),
                InProgress = g.Count(t => t.Status == TaskStatus.InProgress),
                Completed  = g.Count(t => t.Status == TaskStatus.Completed),
                Overdue    = g.Count(t =>
                    t.DueDate < DateTime.UtcNow &&
                    t.Status != TaskStatus.Completed &&
                    t.Status != TaskStatus.Cancelled),
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            targetUser.Id,
            targetUser.FirstName,
            targetUser.LastName,
            targetUser.Email,
            targetUser.ProfilePictureUrl,
            targetUser.Bio,
            targetUser.Designation,
            targetUser.CreatedAt,
            taskStats = new
            {
                total      = taskStats?.Total      ?? 0,
                inProgress = taskStats?.InProgress ?? 0,
                completed  = taskStats?.Completed  ?? 0,
                overdue    = taskStats?.Overdue    ?? 0,
            }
        });
    }
}