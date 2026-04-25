namespace Project.DTO;

// Paged version of MyTasksDTO — each section independently paged
public record MyTasksPagedDTO(
    PagedResult<TaskResponseDTO> AssignedActive,
    PagedResult<TaskResponseDTO> AssignedCompleted,
    PagedResult<TaskResponseDTO> Created
);
