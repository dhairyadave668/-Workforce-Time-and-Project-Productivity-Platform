using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Identity.Repository;

public interface IUserRepository
{
    // Original method (preserved)
    Task<User?> GetUserByEntraIdAsync(string entraId);

    // Additional methods for modularization (new, but do not break existing)
    Task<User?> GetUserByIdAsync(Guid id);
    Task<User?> GetUserByEmailAsync(string email);
    Task<List<User>> GetAllActiveUsersAsync();          // !IsDeleted
    Task<List<User>> GetUsersWithRoleAsync();           // !IsDeleted with Role
    Task<bool> ExistsByEntraIdAsync(string entraId);
    Task<bool> ExistsByEmailAsync(string email);
    void Add(User user);
    void Update(User user);
    Task SaveChangesAsync();

    // *** NEW: Exact replicas of original queries that ignore IsDeleted ***
    Task<User?> GetUserByEntraIdOrEmailAsync(string entraId, string email);   // For login
    Task<User?> GetUserByEntraIdIncludingDeletedAsync(string entraId);        // For AddUser (restore)
    Task<User?> GetUserByIdIncludingDeletedAsync(Guid id);                    // For ChangeUserRole
}