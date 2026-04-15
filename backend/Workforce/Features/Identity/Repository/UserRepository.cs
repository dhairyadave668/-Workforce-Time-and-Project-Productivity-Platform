using Microsoft.EntityFrameworkCore;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Identity.Infrastructure;
using Workforce.Infrastructure.Persistence; 
namespace Workforce.Features.Identity.Repository;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    // Original method – unchanged
    public async Task<User?> GetUserByEntraIdAsync(string entraId)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.EntraId == entraId && !u.IsDeleted);
    }

    // New methods (active users only)
    public async Task<User?> GetUserByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _context.Users
            .AsNoTracking()  // 👈 Add this to ignore cached entities
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);
    }

    public async Task<List<User>> GetAllActiveUsersAsync()
    {
        return await _context.Users
            .Where(u => !u.IsDeleted)
            .ToListAsync();
    }

    public async Task<List<User>> GetUsersWithRoleAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Where(u => !u.IsDeleted)
            .OrderByDescending(u => u.CreatedOn)
            .ToListAsync();
    }

    public async Task<bool> ExistsByEntraIdAsync(string entraId)
    {
        return await _context.Users.AnyAsync(u => u.EntraId == entraId && !u.IsDeleted);
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email && !u.IsDeleted);
    }

    public void Add(User user) => _context.Users.Add(user);
    public void Update(User user) => _context.Users.Update(user);
    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();

    // *** NEW: Exact replica of original login query (no IsDeleted filter) ***
    public async Task<User?> GetUserByEntraIdOrEmailAsync(string entraId, string email)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.EntraId == entraId || u.Email == email);
    }

    // *** NEW: For AddUser – find by EntraId even if soft‑deleted ***
    public async Task<User?> GetUserByEntraIdIncludingDeletedAsync(string entraId)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.EntraId == entraId);
    }

    // *** NEW: For ChangeUserRole – find by Id even if soft‑deleted ***
    public async Task<User?> GetUserByIdIncludingDeletedAsync(Guid id)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id);
    }
}