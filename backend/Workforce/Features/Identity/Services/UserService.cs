using Workforce.Features.Identity.DTOs;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Identity.Repository;

namespace Workforce.Features.Identity.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;
    private readonly IRoleRepository _roleRepo;

    public UserService(IUserRepository userRepo, IRoleRepository roleRepo)
    {
        _userRepo = userRepo;
        _roleRepo = roleRepo;
    }

    public async Task<List<UserResponse>> GetUsers()
    {
        var users = await _userRepo.GetUsersWithRoleAsync();
        return users.Select(u => new UserResponse
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Role = u.Role?.RoleName ?? "Employee",
            RoleId = u.RoleId,   // ✅ NEW
            CreatedOn = u.CreatedOn
        }).ToList();
    }
    //(add this method)
    public async Task<UserResponse?> GetUserByEntraIdAsync(string entraId)
    {
        var user = await _userRepo.GetUserByEntraIdAsync(entraId); // active only
        if (user == null) return null;

        return new UserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role?.RoleName ?? "Employee",
            RoleId = user.RoleId,   // ✅ NEW
            CreatedOn = user.CreatedOn
        };
    }
    public async Task<bool> AddUser(string entraId, string name, string email, string roleName)
    {
        // No validation: always add user, ignore duplicates and role existence
        var user = new Workforce.Features.Identity.Entities.User
        {
            Id = Guid.NewGuid(),
            EntraId = entraId,
            Name = name,
            Email = email,
            RoleId = Guid.NewGuid(),
            CreatedOn = DateTime.UtcNow,
            UpdatedOn = DateTime.UtcNow,
            IsDeleted = false
        };
        _userRepo.Add(user);
        await _userRepo.SaveChangesAsync();
        return true;
    }
    public async Task<bool> ChangeUserRole(Guid userId, string roleName)
    {
        // ✅ Original: find by Id including soft‑deleted
        var user = await _userRepo.GetUserByIdIncludingDeletedAsync(userId);
        if (user == null) return false;

        var role = await _roleRepo.GetRoleByNameAsync(roleName);
        if (role == null) return false;

        user.RoleId = role.Id;
        user.UpdatedOn = DateTime.UtcNow;
        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteUser(Guid userId)
    {
        var user = await _userRepo.GetUserByIdAsync(userId); // only active users can be deleted
        if (user == null) return false;

        user.IsDeleted = true;
        user.UpdatedOn = DateTime.UtcNow;
        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();
        return true;
    }

    public async Task<string?> GetUserRoleByEntraId(string entraId)
    {
        var user = await _userRepo.GetUserByEntraIdAsync(entraId); // active only
        return user?.Role?.RoleName;
    }
}