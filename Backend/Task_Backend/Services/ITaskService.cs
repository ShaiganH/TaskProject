using Project.DTO;
using Project.Model;

namespace Project.Service;

public interface ITaskService
{
    Task CreateTaskAsync(CreateTaskDTO dto, string userId);

    Task<PagedResult<TaskResponseDTO>> GetDashboardTasksAsync(
        string userId, bool isAdmin, TaskQueryParams query);

    Task<PagedResult<TaskResponseDTO>> GetMyTasksAsync(string userId, TaskQueryParams q);

    Task<TaskResponseDTO> GetTaskByIdAsync(Guid taskId, string userId, bool isAdmin);

    Task UpdateTaskAsync(Guid taskId, UpdateTaskDTO dto, string userId, bool isAdmin);

    Task UpdateStatusAsync(Guid taskId, TaskStatus status, string userId, bool isAdmin);

    Task DeleteTaskAsync(Guid taskId, string userId, bool isAdmin);

    Task AddCommentAsync(Guid taskId, string userId, string content, bool isAdmin);
}
