using System.ComponentModel.DataAnnotations;

namespace Project.DTO;


//---------------Requests-----------------
public record Registerrequest(
    [Required][EmailAddress]
    string Email,
    [Required][MinLength(8)]
    string Password,
    [Required]
    string Firstname,
    [Required]
    string Lastname
);



public record Loginrequest(
    [Required][EmailAddress]
    string Email,
    [Required]
    string Password
);


//---------------Responses------------------


public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiry,
    UserDto User
);

public record UserDto(
    string Id,
    string Email,
    string FirstName,
    string LastName
);