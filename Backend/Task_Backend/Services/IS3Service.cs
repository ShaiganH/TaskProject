namespace Project.Service;

public interface IS3Service
{
    Task<string> UploadFileAsync(IFormFile file, string userId);
    Task DeleteFileAsync(string fileUrl);
}