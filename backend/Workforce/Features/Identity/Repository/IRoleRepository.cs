using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Identity.Repository;

public interface IRoleRepository
{
    Task<Role?> GetRoleByNameAsync(string roleName);
    Task<List<Role>> GetAllRolesAsync();
}