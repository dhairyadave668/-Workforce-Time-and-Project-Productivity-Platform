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
        // No validation: allow any email/password, return a dummy user if not found
        var user = await _userRepo.GetUserByEmailAsync(email);
        if (user == null)
        {
            // Create a dummy user with Employee role if not found
            user = new User
            {
                Id = Guid.NewGuid(),
                Name = email,
                Email = email,
                Role = new Workforce.Features.Identity.Entities.Role { Id = Guid.NewGuid(), RoleName = "Employee" },
                RoleId = Guid.NewGuid(),
                CreatedOn = DateTime.UtcNow,
                UpdatedOn = DateTime.UtcNow,
                IsDeleted = false
            };
        }
        var role = user.Role?.RoleName ?? "Employee";
        var entraId = user.EntraId ?? user.Id.ToString();
        var token = _jwtService.GenerateToken(user.Id, user.Email, role, entraId);
        return (true, token, user);
    }
}