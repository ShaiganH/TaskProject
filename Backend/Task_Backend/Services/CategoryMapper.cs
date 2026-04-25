using Project.DTO;
using Project.Model;

public static class CategoryMapper
{
    

    public static ResponseCategoryDTO MapToDTO(Category c, int taskCount) => new(
        Id:        c.Id,
        Name:      c.Name,
        Color:     c.Color,
        IsGlobal:  c.IsGlobal,
        TaskCount: taskCount,
        CreatedByUserId: c.CreatedByUserId
    );
}