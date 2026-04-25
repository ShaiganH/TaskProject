using Project.DTO;
using Microsoft.AspNetCore.Http;

namespace Project.Service;

public interface IProfileService
{
    Task<UserProfileDTO>  GetProfileAsync(string userId);
    Task<UserProfileDTO>  UpdateProfileAsync(string userId, UpdateProfileDTO dto);
    Task<string>          UploadProfilePictureAsync(string userId, IFormFile file);
    Task                  ChangePasswordAsync(string userId, ChangePasswordDTO dto);
    Task                  DeleteAccountAsync(string userId, string currentPassword);
}
