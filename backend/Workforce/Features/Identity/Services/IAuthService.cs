using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Identity.Services;

public interface IAuthService
{
    Task<(bool success, string? token, User? user)> LoginAsync(string email, string? password);
}
