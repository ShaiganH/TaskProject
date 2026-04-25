using Microsoft.EntityFrameworkCore;
using Project.DTO;
using Project.Model;
namespace Project.Utility;
public static class PaginationHelper
{
    public static async Task<PagedResult<TDto>> PaginateAsync<TDto>(
        IQueryable<Tasks> query, int page, int pageSize,
        Func<Tasks, TDto> mapper)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<TDto>(
            Items: items.Select(mapper),
            TotalCount: total,
            Page: page,
            PageSize: pageSize,
            TotalPages: (int)Math.Ceiling(total / (double)pageSize)
        );
    }
}