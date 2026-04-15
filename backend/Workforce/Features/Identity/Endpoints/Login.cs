using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.Identity.DTOs;
using Workforce.Features.Identity.Services;

namespace Workforce.Features.Identity.Endpoints;

public static class LoginEndpoint
{
    public static IEndpointRouteBuilder MapLoginEndpoint(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication");

        group.MapPost("/login", async (
            LoginRequest request,
            IAuthService authService,
            AuditLogService auditLogService,
            HttpContext http) =>
        {
            var (success, token, user) = await authService.LoginAsync(request.Email, request.Password);
            if (!success || user == null)
                return Results.Unauthorized();

            // Add claims to current user (optional, for downstream usage)
            var identity = new ClaimsIdentity(new[]
            {
                new Claim("id", user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role!.RoleName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("oid", user.EntraId ?? user.Id.ToString()) // keep EntraId for compatibility
            }, "jwt");
            http.User.AddIdentity(identity);

            http.Items["SkipAudit"] = true;

            await auditLogService.CreateLog(user.EntraId ?? user.Id.ToString(), new CreateAuditLogDto
            {
                Action = "LOGIN",
                Target = "/api/auth/login",
                Metadata = $"User logged in. Email: {user.Email}",
                RoleId = user.RoleId
            });

            return Results.Ok(new LoginResponse
            {
                Id = user.Id,
                EntraId = user.EntraId ?? "",
                Name = user.Name,
                Email = user.Email,
                Role = user.Role!.RoleName,
                Token = token
            });
        })
        .AllowAnonymous();

        return app;
    }
}

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}