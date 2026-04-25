using Project.Model;

namespace Project.Service;

public interface ITaskPermissionService
{
    public bool IsAdmin(bool isAdmin);
    public bool CanView(User user, Tasks task,bool isAdmin);
    public bool CanComment(User user, Tasks task,bool isAdmin);
    public bool CanUpdateStatus(User user, Tasks task,bool isAdmin);
    public bool CanEdit(User user, Tasks task,bool isAdmin);
    public bool CanDelete(User user, Tasks task,bool isAdmin);
    public bool CanManageCategory(User user, Category category,bool isAdmin);
}