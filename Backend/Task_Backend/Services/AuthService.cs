using Project.Data;
using Project.DTO;
using Project.Model;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Project.Validation;
using Project.Exceptions;

namespace Project.Service;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly ItokenService _tokenService;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly RegisterValidation _validations;
    public AuthService(
        UserManager<User> userManager,
        ItokenService tokenService,
        ApplicationDbContext db,
        IConfiguration config,
        RegisterValidation validationRules
    )
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _db = db;
        _config = config;
        _validations = validationRules;
    }
    public async Task<(AuthResponse response, string rawRefreshToken)> LoginAsync(Loginrequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Always check both conditions before revealing any result.
        // Prevents user enumeration — attacker can't tell if email exists.
        if (user is null) throw new UnauthorizedException("Invalid wrong credentials.");

        // ── Lockout Check ─────────────────────────────────────────────────────
        // The lockout OPTIONS we set in Program.cs (MaxFailedAttempts, LockoutTimeSpan)
        // are still respected — UserManager reads them when we call these methods.

        if (await _userManager.IsLockedOutAsync(user))
        {
            throw new UnauthorizedException(
                "Account locked due to too many failed attempts. Try again later.");
        }

        // -- Password Check -----------------------------------------------------
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);

        if (!passwordValid)
        {
            // Tell UserManager to record a failed attempt.
            // Internally it increments AccessFailedCount in the DB.
            // When count hits MaxFailedAccessAttempts, it sets LockoutEnd automatically.
            await _userManager.AccessFailedAsync(user);

            // Check if THIS failed attempt just triggered the lockout
            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new UnauthorizedException(
                    "Account locked due to too many failed attempts. Try again in a few minutes.");
            }

            throw new UnauthorizedException("Invalid credentials.");
        }

        // ── Success ───────────────────────────────────────────────────────────
        // Reset the failed attempt counter on successful login
        await _userManager.ResetAccessFailedCountAsync(user);
        await RemoveExpiredTokensAsync(user.Id);
        return await BuildAuthResponseAsync(user);

    }

    public async Task LogoutAllDevices(string userId)
    {
        var activeTokens = await _db.RefreshTokens
                            .Where(r => r.UserId == userId && r.RevokedAt == null)
                            .ToListAsync();
        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var tokenHash = _tokenService.HashToken(refreshToken);
        var storedToken = await _db.RefreshTokens
            .SingleOrDefaultAsync(r => r.TokenHashed == tokenHash);

        if (storedToken is { IsActive: true })
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<(AuthResponse response, string rawRefreshToken)> RefreshAsync(string refreshToken)
    {
        var tokenHash = _tokenService.HashToken(refreshToken);

        var storedToken = await _db.RefreshTokens
                            .Include(u => u.User)
                            .SingleOrDefaultAsync(e => e.TokenHashed == tokenHash);

        if (storedToken == null)
            throw new UnauthorizedException("Invalid refresh token.");
            var user = await _userManager.FindByIdAsync(storedToken.UserId);

        // Check if user was blocked since the token was issued
        if (user == null || await _userManager.IsLockedOutAsync(user))
        {
            // Revoke the token now so it can't be used again
            storedToken.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            throw new UnauthorizedException("User is blocked");
        }


        // Reuse detection — revoked token being replayed = likely stolen
        // Nuclear option: kill every session for this user immediately
        if (storedToken.IsRevoked)
        {
            await LogoutAllDevices(storedToken.UserId);
            throw new ForbiddenException(
                "Security violation detected. All sessions have been revoked.");
        }

        if (storedToken.IsExpired)
            throw new UnauthorizedException("Refresh token expired. Please log in again.");

        // Rotate — mark current token as used, issue a new one
        storedToken.RevokedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return await BuildAuthResponseAsync(storedToken.User);
    }

    public async Task<(AuthResponse response, string rawRefreshToken)> RegisterAsync(Registerrequest request)
    {
        var validationResults = _validations.Validate(request);
        if (!validationResults.IsValid)
        {
            var errors = validationResults.Errors
                .Select(e => e.ErrorMessage)
                .ToList();
            throw new InvalidRegisterException(errors);
        }
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null) throw new InvalidRegisterException(new List<string> { "User with this email already exists" });

        var user = new User()
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.Firstname,
            LastName = request.Lastname
        };

        // UserManager.Chttps://msdn.microsoft.com/query/roslyn.query?appId=roslyn&k=k(CS1503)reateAsync handles BCrypt hashing internally
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors
        .Select(e => e.Description)
        .ToList();

            throw new InvalidRegisterException(errors);
        }

        await _userManager.AddToRoleAsync(user, "User");
        return await BuildAuthResponseAsync(user);
    }




    // -- Helpers ------------------------------------------------------------
    private async Task<(AuthResponse, string)> BuildAuthResponseAsync(User user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _tokenService.GenerateAccessToken(user, roles);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();
        var refreshExpiry = DateTime.UtcNow.AddDays(
                                  int.Parse(_config["Jwt:RefreshTokenExpiryDays"]!));
        var accessExpiry = DateTime.UtcNow.AddMinutes(
                                  int.Parse(_config["Jwt:AccessTokenExpiryMinutes"]!));

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHashed = _tokenService.HashToken(rawRefreshToken),
            ExpiresAt = refreshExpiry
        });
        await _db.SaveChangesAsync();

        var response = new AuthResponse(
            AccessToken: accessToken,
            AccessTokenExpiry: accessExpiry,
            User: new UserDto(user.Id, user.Email!, user.FirstName!, user.LastName!)
        );

        return (response, rawRefreshToken);

    }

    private async Task RemoveExpiredTokensAsync(string userId)
    {
        var expired = await _db.RefreshTokens
                        .Where(r => r.UserId == userId && r.ExpiresAt < DateTime.UtcNow)
                        .ToListAsync();

        _db.RefreshTokens.RemoveRange(expired);
        await _db.SaveChangesAsync();
    }
}