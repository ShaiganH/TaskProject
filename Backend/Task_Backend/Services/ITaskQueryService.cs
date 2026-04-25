
using Project.DTO;
using Project.Model;

namespace Project.Service;
public interface ITaskQueryService
{
    public IQueryable<Tasks> ApplyFilters(
        IQueryable<Tasks> query, TaskQueryParams q);

    public IQueryable<Tasks> ApplySort(
        IQueryable<Tasks> query, TaskSortBy sortBy);
    public IQueryable<Tasks> ApplyBaseIncludes(IQueryable<Tasks> query);
    public IQueryable<Tasks> ApplyVisibility(
        IQueryable<Tasks> query, string userId, bool isAdmin);
}