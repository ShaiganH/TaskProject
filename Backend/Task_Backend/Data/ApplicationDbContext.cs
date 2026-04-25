using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Project.Configurations;
using Project.Model;

namespace Project.Data;

public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    
    }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Tasks> Tasks { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<TaskAuditLog> TaskAuditLogs { get; set; }

    public DbSet<CategoryAuditLog> CategoryAuditLogs { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfiguration(new TaskConfiguration());
        modelBuilder.ApplyConfiguration(new CategoryConfiguration());
        modelBuilder.ApplyConfiguration(new TaskCommentConfiguration());
        modelBuilder.ApplyConfiguration(new TaskAuditLogConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new RefreshTokenConfiguration());
        modelBuilder.ApplyConfiguration(new CategoryAuditLogConfiguration());
        modelBuilder.ApplyConfiguration(new CommentsConfiguration());
    }
}