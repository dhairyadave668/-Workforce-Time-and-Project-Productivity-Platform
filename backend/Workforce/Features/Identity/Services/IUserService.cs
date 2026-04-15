using Workforce.Features.Identity.DTOs;

namespace Workforce.Features.Identity.Services;

public interface IUserService
{
    Task<List<UserResponse>> GetUsers();
    Task<UserResponse?> GetUserByEntraIdAsync(string entraId);   // NEW
    Task<bool> AddUser(string entraId, string name, string email, string roleName);
    Task<bool> ChangeUserRole(Guid userId, string roleName);
    Task<bool> DeleteUser(Guid userId);
    Task<string?> GetUserRoleByEntraId(string entraId);
}