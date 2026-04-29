using Microsoft.AspNetCore.Identity;
using Project.Model;
namespace Project.Service;
using Microsoft.Extensions.Options;

public static class DataSeeding
{
    public static async Task SeedRolesAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (var role in new[] { "Admin", "User" })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        } 
    }
public static async Task SeedAdminUserAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var adminSettings = scope.ServiceProvider.GetRequiredService<IOptions<AdminSettings>>().Value;

    var existingUser = await userManager.FindByEmailAsync(adminSettings.Email);

    if (existingUser == null)
    {
        var adminUser = new User
        {
            Email = adminSettings.Email,
            UserName = adminSettings.Email,
            EmailConfirmed = true,
            FirstName = adminSettings.FirstName,
            LastName = adminSettings.LastName,
            CreatedAt = DateTime.UtcNow
        };

        await userManager.CreateAsync(adminUser, adminSettings.Password);
        await userManager.AddToRoleAsync(adminUser, "Admin");
    }
}
}