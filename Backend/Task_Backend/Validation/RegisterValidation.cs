using FluentValidation;
using Project.DTO;

namespace Project.Validation;

public class RegisterValidation : AbstractValidator<Registerrequest>
{
    public RegisterValidation()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().WithMessage("Valid email is required");
        RuleFor(r => r.Firstname).NotEmpty().MinimumLength(3).MaximumLength(50).WithMessage("First name is required between 3 to 50 characters");
        RuleFor(r => r.Lastname).NotEmpty().MinimumLength(3).MaximumLength(50).WithMessage("Last name is required between 3 to 50 characters");
        RuleFor(r => r.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit")
            .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character");
    }
}