using Project.DTO;

namespace Project.Service;

public interface ICategoryService
{
    Task<ResponseCategoryDTO>              CreateCategoryAsync(CreateCategoryDTO dto, string userId, bool isAdmin);
    Task<IEnumerable<ResponseCategoryDTO>> GetCategoriesForUserAsync(string userId, bool isAdmin);
    Task<ResponseCategoryDTO>              GetCategoryByIdAsync(Guid id);
    Task                                   UpdateCategoryAsync(Guid id, UpdateCategoryDTO dto, string userId, bool isAdmin);
    Task                                   DeleteCategoryAsync(Guid id, string userId, bool isAdmin);
}
