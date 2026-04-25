using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Exceptions;
using Project.Model;
using Project.Service;

namespace Project.Service;

public class ProfileService : IProfileService
{
    private readonly UserManager<User>    _userManager;
    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment  _env;

    // Maximum allowed profile picture size in bytes (2 MB)
    private const long MaxPictureSizeBytes = 2 * 1024 * 1024;

    // Permitted MIME types for profile pictures
    private static readonly string[] AllowedMimeTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif"];

    public ProfileService(
        UserManager<User>    userManager,
        ApplicationDbContext db,
        IWebHostEnvironment  env)
    {
        _userManager = userManager;
        _db          = db;
        _env         = env;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET PROFILE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<UserProfileDTO> GetProfileAsync(string userId)
    {
        var user  = await GetUserOrThrowAsync(userId);
        var roles = await _userManager.GetRolesAsync(user);

        return MapToDTO(user, roles.FirstOrDefault() ?? "User");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROFILE  (bio + designation only — name / email via separate flows)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<UserProfileDTO> UpdateProfileAsync(string userId, UpdateProfileDTO dto)
    {
        var user = await GetUserOrThrowAsync(userId);

        user.Bio        = dto.Bio?.Trim();
        user.Designation = dto.Designation?.Trim();
        user.UpdatedAt  = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new BadReqException(JoinErrors(result));

        var roles = await _userManager.GetRolesAsync(user);
        return MapToDTO(user, roles.FirstOrDefault() ?? "User");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD PROFILE PICTURE
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Saves the file to wwwroot/profile-pictures/{userId}{ext} and returns
    /// the public URL path. In production swap this with an S3/Azure Blob upload.
    /// </summary>
    public async Task<string> UploadProfilePictureAsync(string userId, IFormFile file)
    {
        // ── Validate ──────────────────────────────────────────────────────────
        if (file.Length == 0)
            throw new InvalidArgumentException("File is empty");

        if (file.Length > MaxPictureSizeBytes)
            throw new InvalidArgumentException("File exceeds the 2 MB limit");

        if (!AllowedMimeTypes.Contains(file.ContentType.ToLower()))
            throw new InvalidArgumentException(
                $"File type '{file.ContentType}' is not allowed. " +
                "Permitted types: JPEG, PNG, WebP, GIF");

        // ── Build storage path ────────────────────────────────────────────────
        var ext         = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName    = $"{userId}{ext}";
        var folder      = Path.Combine(_env.WebRootPath, "profile-pictures");

        Directory.CreateDirectory(folder);   // ensure folder exists

        var fullPath = Path.Combine(folder, fileName);

        // ── Write to disk ─────────────────────────────────────────────────────
        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream);

        // ── Persist URL on user ───────────────────────────────────────────────
        var relativePath = $"/profile-pictures/{fileName}";

        var user = await GetUserOrThrowAsync(userId);
        user.ProfilePictureUrl = relativePath;
        user.UpdatedAt         = DateTime.UtcNow;

        await _userManager.UpdateAsync(user);

        return relativePath;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHANGE PASSWORD
    // ─────────────────────────────────────────────────────────────────────────
    public async Task ChangePasswordAsync(string userId, ChangePasswordDTO dto)
    {
        if (dto.NewPassword != dto.ConfirmNewPassword)
            throw new BadReqException("New password and confirmation do not match");

        var user = await GetUserOrThrowAsync(userId);

        var result = await _userManager.ChangePasswordAsync(
            user, dto.CurrentPassword, dto.NewPassword);

        if (!result.Succeeded)
            throw new InvalidArgumentException(JoinErrors(result));

        // Invalidate all existing refresh tokens so other devices must re-login
        var tokens = await _db.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
            token.RevokedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE ACCOUNT
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Requires the user's current password for confirmation.
    /// Soft-delete alternative: set a DeletedAt timestamp instead of hard-deleting.
    /// Here we do a hard delete — all their data (tasks, comments, tokens) is
    /// cascade-deleted by the DB constraints defined in ApplicationDbContext.
    /// Tasks assigned to them have AssignedToUserId set to NULL (SetNull behaviour).
    /// </summary>
    public async Task DeleteAccountAsync(string userId, string currentPassword)
    {
        var user = await GetUserOrThrowAsync(userId);

        // Verify password before deletion — extra confirmation step
        var passwordValid = await _userManager.CheckPasswordAsync(user, currentPassword);
        if (!passwordValid)
            throw new UnauthorizedException("Incorrect password. Account deletion cancelled.");

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            throw new BadReqException(JoinErrors(result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<User> GetUserOrThrowAsync(string userId)
        => await _userManager.FindByIdAsync(userId)
           ?? throw new NotFoundException($"User {userId} not found");

    private static UserProfileDTO MapToDTO(User u, string role) => new(
        Id:                u.Id,
        Email:             u.Email ?? string.Empty,
        FirstName:         u.FirstName,
        LastName:          u.LastName,
        Bio:               u.Bio,
        Designation:        u.Designation,
        ProfilePictureUrl: u.ProfilePictureUrl,
        Role:              role,
        CreatedAt:         u.CreatedAt
    );

    private static string JoinErrors(IdentityResult result)
        => string.Join(", ", result.Errors.Select(e => e.Description));
}
