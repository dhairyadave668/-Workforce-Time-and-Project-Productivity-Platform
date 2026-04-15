using Microsoft.AspNetCore.Authorization;
using Workforce.Infrastructure.Services;
using Workforce.Features.Identity.DTOs;
using Workforce.Features.Identity.Repository;

namespace Workforce.Features.Identity.Endpoints;

public static class EntraUsers
{
    public static IEndpointRouteBuilder MapEntraUsers(this IEndpointRouteBuilder app)
    {
        app.MapGet("/all-users", async (
            GraphService graph,
            IUserRepository userRepo) =>   // ← Changed from IdentityDbContext to IUserRepository
        {
            // Get existing user emails from DB (active users only)
            var existingUsers = await userRepo.GetAllActiveUsersAsync();
            var existingEmails = new HashSet<string>(
                existingUsers.Select(u => u.Email.ToLower())
            );

            // Fetch users from Entra
            var response = await graph.Client.Users.GetAsync(config =>
            {
                config.QueryParameters.Select = new[]
                {
                    "id",
                    "displayName",
                    "mail",
                    "userPrincipalName"
                };
            });

            if (response?.Value == null)
                return Results.Ok(new List<EmployeeDto>());

            var users = response.Value
                .Where(u =>
                {
                    if (u.DisplayName == null) return false;
                    var email = (u.Mail ?? u.UserPrincipalName)?.ToLower();
                    return email != null && !existingEmails.Contains(email);
                })
                .Select(u => new EmployeeDto
                {
                    Id = u.Id!,
                    Name = u.DisplayName!,
                    Email = u.Mail ?? u.UserPrincipalName!
                })
                .ToList();

            return Results.Ok(users);
        })
        .RequireAuthorization(policy => policy.RequireRole("Admin"))
        .WithTags("Entra Users");

        return app;
    }
}