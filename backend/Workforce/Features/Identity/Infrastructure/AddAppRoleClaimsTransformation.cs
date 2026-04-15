using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using Workforce.Features.Identity.Infrastructure;
using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.Identity.Infrastructure;

public class AddAppRoleClaimsTransformation : IClaimsTransformation
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public AddAppRoleClaimsTransformation(
        AppDbContext db,
        IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = principal.Identity as ClaimsIdentity;

        if (identity == null || !identity.IsAuthenticated)
            return principal;

        var entraId =
            principal.FindFirst("oid")?.Value ??
            principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(entraId))
            return principal;

        var cacheKey = $"user_role_{entraId}";

        if (!_cache.TryGetValue(cacheKey, out string? role))
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.EntraId == entraId &&
                    !u.IsDeleted);

            role = user?.Role?.RoleName;

            if (!string.IsNullOrEmpty(role))
            {
                _cache.Set(cacheKey, role, TimeSpan.FromMinutes(30));
            }
        }

        if (!string.IsNullOrEmpty(role))
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, role));
        }

        return principal;
    }
}