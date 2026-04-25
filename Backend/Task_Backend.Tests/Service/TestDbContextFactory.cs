using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.Model;

namespace Project.Tests;

/// <summary>
/// Creates a fresh in-memory ApplicationDbContext for each test.
/// Each call gets its own isolated database so tests don't bleed into each other.
/// </summary>
public static class TestDbContextFactory
{
    public static ApplicationDbContext Create(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;

        var db = new ApplicationDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    /// <summary>
    /// Seeds a user directly into the DB (bypasses Identity pipeline — good for unit tests).
    /// </summary>
    public static User SeedUser(ApplicationDbContext db, string id = "user-1", string role = "User")
    {
        var user = new User
        {
            Id        = id,
            UserName  = $"{id}@test.com",
            Email     = $"{id}@test.com",
            FirstName = "Test",
            LastName  = "User",
        };

        db.Users.Add(user);

        // Add role if needed
        var roleId = $"role-{role}";
        if (!db.Roles.Any(r => r.Name == role))
        {
            db.Roles.Add(new IdentityRole { Id = roleId, Name = role, NormalizedName = role.ToUpper() });
        }

        db.UserRoles.Add(new IdentityUserRole<string> { UserId = id, RoleId = roleId });
        db.SaveChanges();
        return user;
    }

    public static Tasks SeedTask(
        ApplicationDbContext db,
        string createdByUserId,
        string? assignedToUserId = null,
        TaskStatus status = TaskStatus.Todo,
        bool isPrivate = false)
    {
        var task = new Tasks
        {
            Id               = Guid.NewGuid(),
            Title            = "Test Task",
            Status           = status,
            Priority         = TaskPriority.Medium,
            CreatedByUserId  = createdByUserId,
            AssignedToUserId = assignedToUserId ?? createdByUserId,
            IsPrivate        = isPrivate,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };

        db.Tasks.Add(task);
        db.SaveChanges();
        return task;
    }
}