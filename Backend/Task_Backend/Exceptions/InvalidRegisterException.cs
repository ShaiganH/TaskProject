namespace Project.Exceptions;

public class InvalidRegisterException : Exception
{
    public List<string> errors { get; set; }
    public InvalidRegisterException(List<string> Errors) :base("Register request is invalid")
    {
        errors = Errors;
    }
}