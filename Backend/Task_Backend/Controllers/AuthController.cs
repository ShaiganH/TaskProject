using Project.DTO;
using Project.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Project.Exceptions;

namespace Project.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private const string RefreshTokenCookieName = "refreshToken";
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] Registerrequest request)
    {
            var result =await _authService.RegisterAsync(request);
            return Ok(result); 
        
    }   

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] Loginrequest request)
    {
            var (response,rawRefreshToken) = await _authService.LoginAsync(request);
            SetRefreshTokenCookie(rawRefreshToken);
            return Ok(response);
        
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        // Read refresh token from HttpOnly cookie — React never touches this
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        if(string.IsNullOrEmpty(refreshToken))
        {
            return Unauthorized("No refresh token");
        }

        try
        {
            var (response,newRawrefreshToken) = await _authService.RefreshAsync(refreshToken);
            SetRefreshTokenCookie(newRawrefreshToken);
            return Ok(response);
        }
        catch (UnauthorizedException)
        {
            // Clear the cookie if refresh fails — force re-login
            DeleteRefreshTokenCookie();
            throw;
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        if(refreshToken == null) return BadRequest("RefreshToken not set in cookie");
        if(!string.IsNullOrEmpty(refreshToken))
        {
            await _authService.LogoutAsync(refreshToken);
        }

        DeleteRefreshTokenCookie();
        return Ok("LoggedOut");
    }

    [HttpPost("logout-all")]
    [Authorize]
    public async Task<IActionResult> LogoutAllDevices()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        await _authService.LogoutAllDevices(userId);
        DeleteRefreshTokenCookie();
        return NoContent();
    }

    [HttpGet("debug")]
    [Authorize]
    public IActionResult Debug()
    {
        return Ok(User.Claims.Select(c => new { c.Type, c.Value }));
    }


    // ── Cookie Helpers ────────────────────────────────────────────────────────
    private void SetRefreshTokenCookie(string token)
    {
        var options = new CookieOptions
        {
            HttpOnly = true, // JS cannot read this — XSS protection
            Secure = true, //Https only
            SameSite = SameSiteMode.Strict, // CSRF Protection
            Expires = DateTime.UtcNow.AddDays(7),
            Path = "/auth" // Cookie only sent to /auth/* routes
                        // NOT sent to /api/* — minimizes exposure
        };
        Response.Cookies.Append(RefreshTokenCookieName,token,options);
    }

    public void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true, // JS cannot read this — XSS protection
            Secure = true, //Https only
            SameSite = SameSiteMode.Strict, // CSRF Protection
            Path = "/auth" // Cookie only sent to /auth/* routes
                        // NOT sent to /api/* — minimizes exposure
        });
    }
}