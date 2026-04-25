using System.Net;
using System.Text.Json;
using Project.Exceptions;
using Microsoft.AspNetCore.Http.HttpResults;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (BadReqException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await WriteResponse(context, ex.Message);
        }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            await WriteResponse(context, ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            await WriteResponse(context, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            await WriteResponse(context, ex.Message);
        }
        catch (InvalidArgumentException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await WriteResponse(context, ex.Message);
        }
        catch (InvalidRegisterException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await WriteResponseForList(context, ex.errors);
        }
    }

    private static async Task WriteResponse(HttpContext context, string message)
    {
        context.Response.ContentType = "application/json";

        var response = new
        {
            error = message
        };

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }


    private static async Task WriteResponseForList(HttpContext context, List<string> errors)
    {
        context.Response.ContentType = "application/json";

        var response = new
        {
            error = errors
        };

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}