using Microsoft.AspNetCore.Identity;

namespace Project.Model;

public class User : IdentityUser
{
    public string  FirstName          { get; set; } = string.Empty;
    public string  LastName           { get; set; } = string.Empty;

    // Profile extras
    public string? Bio                { get; set; }
    public string? Designation         { get; set; }

    public bool    IsBlocked          { get; set; } = false;  // for admin control
    public string? ProfilePictureUrl  { get; set; }   // stored path / CDN URL

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Tasks>        CreatedTasks  { get; set; } = new List<Tasks>();
    public ICollection<Tasks>        AssignedTasks { get; set; } = new List<Tasks>();
    public ICollection<Category>     Categories    { get; set; } = new List<Category>();
    public ICollection<TaskComment>  Comments      { get; set; } = new List<TaskComment>();
    public ICollection<RefreshToken> RefreshToken  { get; set; } = new List<RefreshToken>();
}
