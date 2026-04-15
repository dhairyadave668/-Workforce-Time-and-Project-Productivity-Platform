using Microsoft.EntityFrameworkCore;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Identity.Infrastructure;
using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.Identity.Repository;

public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _context;

    public RoleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Role?> GetRoleByNameAsync(string roleName)
    {
        return await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
    }

    public async Task<List<Role>> GetAllRolesAsync()
    {
        return await _context.Roles.ToListAsync();
    }
}