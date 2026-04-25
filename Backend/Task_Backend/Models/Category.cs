// Category.cs
namespace Project.Model;
public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; } // e.g. "#FF5733"
    public string CreatedByUserId { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<Tasks> Tasks { get; set; } = new List<Tasks>();
}