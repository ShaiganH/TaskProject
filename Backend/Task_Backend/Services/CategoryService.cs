using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.DTO;
using Project.Exceptions;
using Project.Model;
using Project.Service;

namespace Project.Service;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext  _db;
    private readonly ITaskPermissionService _permission;

    private readonly IAuditWriter _auditWriter;

    public CategoryService(ApplicationDbContext db, ITaskPermissionService permission, IAuditWriter auditWriter)
    {
        _db         = db;
        _permission = permission;
        _auditWriter = auditWriter;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ResponseCategoryDTO> CreateCategoryAsync(
        CreateCategoryDTO dto, string userId, bool isAdmin)
    {
        var normalized = dto.Name.Trim().ToLower();

        // Duplicate check — same name in global pool OR in user's personal pool
        var exists = await _db.Categories.AnyAsync(c =>
            c.Name.ToLower() == normalized &&
            (c.IsGlobal || c.CreatedByUserId == userId)
        );

        if (exists)
            throw new BadReqException("A category with this name already exists");

        var category = new Category
        {
            Id              = Guid.NewGuid(),
            Name            = dto.Name.Trim(),
            Color           = dto.Color,
            CreatedByUserId = userId,
            // Only admins can create global categories
            IsGlobal        = isAdmin,
        };

        await _db.Categories.AddAsync(category);
        await _db.SaveChangesAsync();

        // Audit log — category creation
        await _auditWriter.LogCategoryAsync(category.Id, userId, "Category Created", null, category.Name);
        await _db.SaveChangesAsync();

        
        

        return CategoryMapper.MapToDTO(category, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ — for a specific user
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Visibility rules:
    ///   1. Global categories (admin-created) → visible to everyone.
    ///   2. User's own personal categories → always visible to them.
    ///   3. Another user's personal category → visible ONLY IF a task using that
    ///      category is assigned to the caller OR created by the caller.
    ///
    /// Example: Dev Ali creates category "Performance Fix" and assigns a task in it
    /// to Fatima. Fatima can now see "Performance Fix". John cannot.
    /// </summary>
    public async Task<IEnumerable<ResponseCategoryDTO>> GetCategoriesForUserAsync(
        string userId, bool isAdmin)
    {
        // Admins see every category
        if (isAdmin)
        {
            var all = await _db.Categories
                .Include(c => c.Tasks)
                .ToListAsync();

            return all.Select(c => CategoryMapper.MapToDTO(c, c.Tasks.Count));
        }

        // Step 1 — find category IDs referenced by tasks the user is involved in
        var involvedCategoryIds = await _db.Tasks
            .Where(t =>
                t.CategoryId != null &&
                (t.AssignedToUserId == userId || t.CreatedByUserId == userId)
            )
            .Select(t => t.CategoryId!.Value)
            .Distinct()
            .ToListAsync();

        // Step 2 — pull matching categories
        var categories = await _db.Categories
            .Where(c =>
                c.IsGlobal                          ||   // rule 1: global
                c.CreatedByUserId == userId          ||   // rule 2: own
                involvedCategoryIds.Contains(c.Id)        // rule 3: shared via task
            )
            .ToListAsync();

        // Step 3 — task counts per category (for display)
        var catIds = categories.Select(c => c.Id).ToList();

        var taskCounts = await _db.Tasks
            .Where(t => t.CategoryId != null && catIds.Contains(t.CategoryId!.Value))
            .GroupBy(t => t.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

        return categories
            .Select(c => CategoryMapper.MapToDTO(c, taskCounts.GetValueOrDefault(c.Id, 0)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ — single
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ResponseCategoryDTO> GetCategoryByIdAsync(Guid id)
    {
        var category = await _db.Categories
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException("Category not found");

        var taskCount = await _db.Tasks.CountAsync(t => t.CategoryId == id);

        return CategoryMapper.MapToDTO(category, taskCount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task UpdateCategoryAsync(
        Guid id, UpdateCategoryDTO dto, string userId, bool isAdmin)
    {
        var category = await _db.Categories.FindAsync(id)
            ?? throw new NotFoundException("Category not found");

        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("User not found");

        if (!_permission.CanManageCategory(user, category,isAdmin))
            throw new ForbiddenException(
                "You can only edit your own categories. Global categories require admin access.");

        var oldName = category.Name;

        category.Name  = dto.Name.Trim();
        category.Color = dto.Color;

        await _auditWriter.LogCategoryAsync(category.Id, userId, "Category Updated", oldName, dto.Name.Trim());
        await _db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task DeleteCategoryAsync(Guid id, string userId, bool isAdmin)
    {
        var category = await _db.Categories.FindAsync(id)
            ?? throw new NotFoundException("Category not found");

        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("User not found");

        if (!_permission.CanManageCategory(user, category,isAdmin))
            throw new ForbiddenException(
                "You can only delete your own categories. Global categories require admin access.");

        // Block deletion if any ACTIVE tasks still use this category
        var hasActiveTasks = await _db.Tasks.AnyAsync(t =>
            t.CategoryId == id &&
            t.Status != TaskStatus.Completed &&
            t.Status != TaskStatus.Cancelled
        );

        if (hasActiveTasks)
            throw new BadReqException(
                "Cannot delete a category that has active tasks. " +
                "Complete or reassign all tasks first.");

        await _auditWriter.LogCategoryAsync(category.Id, userId, "Category Deleted", category.Name, null);
        await _db.SaveChangesAsync();    // save the log before the category is gone

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
    }


}
