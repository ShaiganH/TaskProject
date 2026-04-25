// TaskComment.cs
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Model;
public class TaskComment
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Guid TaskId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public Tasks Task { get; set; } = null!;
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}