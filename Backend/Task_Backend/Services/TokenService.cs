using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Project.Model;
using Microsoft.IdentityModel.Tokens;

namespace Project.Service;

public class TokenService : ItokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }


    public string GenerateAccessToken(User user, IList<string> Roles)
    {
        // Claims are the payload that we insert in token
        var Claims = new List<Claim>
        {
            // "sub" (subject) = who this token is about. Standard JWT claim.
            new(JwtRegisteredClaimNames.Sub,user.Id),

            // "jti" (JWT ID) = unique ID for this specific token
            // Useful if you ever need a token blocklist
            new(JwtRegisteredClaimNames.Jti,Guid.NewGuid().ToString()),

            new(JwtRegisteredClaimNames.Email,user.Email!),
            new("FirstName",user.FirstName!),
            new("LastName",user.LastName!)
        };

        // Add each Role as a claim. this is what [Authorize(Roles = "Admin")] reads
        foreach (var role in Roles)
        {
            Claims.Add(new Claim(ClaimTypes.Role,role));
        }

        // The signing key — must be the same key used to verify
        // Never hardcode this — comes from config (environment variable in production)
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var cred = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:AccessTokenExpiryMinutes"]!));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: Claims,
            expires: expiry,
            signingCredentials: cred
        );


        // Serialize to the 3-part string: header.payload.signature
        return new JwtSecurityTokenHandler().WriteToken(token);
    }


    // ── Refresh Token ────────────────────────────────────────────────────────
    // NOT a JWT — just a cryptographically random string
    // It has no meaning by itself; meaning comes from the DB record
    public string GenerateRefreshToken()
    {
        // RandomNumberGenerator is cryptographically secure
        // (unlike Random.Next() which is predictable)

        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);  
    }

    // Used during refresh — we need to read claims from an EXPIRED access token
    // to know which user is requesting the refresh
    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationsParam = new TokenValidationParameters{
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = _config["Jwt:Issuer"],
            ValidAudience            = _config["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)),

            // The key difference — we DON'T validate expiry here
            // because the whole point is to read claims from an expired token
            ValidateLifetime         = false,
        };

        var handler = new JwtSecurityTokenHandler();

        try
        {
            var principal = handler.ValidateToken(
                token, tokenValidationsParam, out var validatedToken
            );

            // Extra check — make sure it's actually a JWT with correct algorithm
            // Prevents algorithm confusion attacks
            if(validatedToken is not JwtSecurityToken jwtToken ||
                !jwtToken.Header.Alg.Equals(
                    SecurityAlgorithms.HmacSha256,
                    StringComparison.InvariantCultureIgnoreCase
                )) 
                return null;
            return principal;
        }
        catch 
        {
            return null; //Malformed token 
        }
    }

    // Hash before storing — if DB leaks, attacker can't use the hashes
    public string HashToken(string token)
    {
       var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
       return Convert.ToBase64String(bytes);
    }
}