using Project.DTO;

namespace Project.Service;

public interface IAuthService
{
    public Task<(AuthResponse response, string rawRefreshToken)> RegisterAsync(Registerrequest request);
    public Task<(AuthResponse response, string rawRefreshToken)> LoginAsync(Loginrequest request);
    public Task<(AuthResponse response, string rawRefreshToken)> RefreshAsync(string refreshToken);
    public Task LogoutAsync(string refreshToken);
    public Task LogoutAllDevices(string userId);
}