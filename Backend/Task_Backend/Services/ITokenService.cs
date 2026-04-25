using System.Security.Claims;
using Project.Model;

namespace Project.Service;

public interface ItokenService
{
    public string GenerateAccessToken(User user,IList<string> Roles);
    public string GenerateRefreshToken();
    public string HashToken(string token);
    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}