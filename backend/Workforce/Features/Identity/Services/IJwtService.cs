// Features/Identity/Services/IJwtService.cs
using System.Security.Claims;

namespace Workforce.Features.Identity.Services;

public interface IJwtService
{
    // ✅ Add the 'entraId' parameter to match the implementation
    string GenerateToken(Guid userId, string email, string role, string entraId);
    ClaimsPrincipal? ValidateToken(string token);
}