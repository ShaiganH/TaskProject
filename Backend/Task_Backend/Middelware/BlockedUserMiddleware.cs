
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Project.Model;

public class BlockedUserMiddleware
{
    private readonly RequestDelegate _next;

    public BlockedUserMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, UserManager<User> userManager)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (userId != null)
            {
                var user = await userManager.FindByIdAsync(userId);

                if (user != null && await userManager.IsLockedOutAsync(user))
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("User is blocked");
                    return;
                }
            }
        }

        await _next(context);
    }
}