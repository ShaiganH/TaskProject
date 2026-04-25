using Project.DTO;

namespace Project.Service;

public interface ITaskCsvService
{
    public Task<byte[]> ExportTasksCsvAsync(string userId, bool isAdmin);

    public Task<ImportResultDTO> ImportTasksCsvAsync(Stream csvStream, string userId, bool isAdmin);
}