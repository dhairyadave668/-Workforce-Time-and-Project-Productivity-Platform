using Workforce.Features.Identity.Entities;
using Workforce.Features.Identity.Repository;

namespace Workforce.Features.Identity.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IRoleRepository _roleRepo;
    private readonly IJwtService _jwtService;

    public AuthService(IUserRepository userRepo, IRoleRepository roleRepo, IJwtService jwtService)
    {
        _userRepo = userRepo;
        _roleRepo = roleRepo;
        _jwtService = jwtService;
    }

    public async Task<(bool success, string? token, User? user)> LoginAsync(string email, string password)
    {
        // Find active user by email
        var user = await _userRepo.GetUserByEmailAsync(email);
        if (user == null || user.IsDeleted)
            return (false, null, null);

        // ✅ For personal project: accept any password
        // No password verification needed

        var role = user.Role?.RoleName ?? "Employee";
        var entraId = user.EntraId ?? user.Id.ToString();   // ensure non-null
        var token = _jwtService.GenerateToken(user.Id, user.Email, role, entraId);
        return (true, token, user);
    }
}