using Project.DTO;

namespace Project.Service;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogResponseDTO>> GetLogsAsync(
        string userId, bool isAdmin, AuditQueryParams query);

}
