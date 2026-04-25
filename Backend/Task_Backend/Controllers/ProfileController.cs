using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.DTO;
using Project.Service;
using System.Security.Claims;

namespace Project.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
        => _profileService = profileService;

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ── GET /api/profile
    // Returns the current user's full profile
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
            var profile = await _profileService.GetProfileAsync(CurrentUserId);
            return Ok(profile);
    }

    // ── PUT /api/profile
    // Update bio and department only
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDTO dto)
    {
            var updated = await _profileService.UpdateProfileAsync(CurrentUserId, dto);
            return Ok(updated);
    }

    // ── POST /api/profile/picture
    // Upload a profile picture (multipart/form-data, field: "file")
    [HttpPost("picture")]
    [RequestSizeLimit(3 * 1024 * 1024)]   // 3 MB ceiling on the request
    public async Task<IActionResult> UploadPicture(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided");

            var url = await _profileService.UploadProfilePictureAsync(CurrentUserId, file);
            return Ok(new { ProfilePictureUrl = url });
    }

    // ── POST /api/profile/change-password
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

            await _profileService.ChangePasswordAsync(CurrentUserId, dto);
            return Ok("Password changed successfully. All other sessions have been signed out.");
    }

    // ── DELETE /api/profile
    // Permanently deletes the account. Requires current password in the body.
    [HttpDelete]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDTO dto)
    {
            await _profileService.DeleteAccountAsync(CurrentUserId, dto.CurrentPassword);
            return Ok("Account deleted successfully.");
    }
}
