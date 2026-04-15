using Microsoft.EntityFrameworkCore;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.AuditLog.Entities;
using Workforce.Infrastructure.Persistence;

namespace Workforce.Features.AuditLog.Repository;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<AuditResponseDto>> GetLogsAsync()
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .Include(x => x.User)
                .ThenInclude(u => u.Role)
            .OrderByDescending(x => x.Timestamp)
            .Select(x => new AuditResponseDto
            {
                Id = x.Id,
                Timestamp = x.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
                UserName = x.User != null ? x.User.Name : "Unknown",
                Action = x.Action ?? "",
                Target = x.Target ?? "",
                Metadata = x.Metadata ?? "",
                RoleName = x.User != null && x.User.Role != null
                    ? x.User.Role.RoleName
                    : "Unknown"
            })
            .ToListAsync();
    }

    public async Task AddLogAsync(Entities.AuditLog log)   // ✅ fully qualified
    {
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> LogExistsAsync(Entities.AuditLog log, DateTime now)   // ✅ fully qualified
    {
        return await _context.AuditLogs.AnyAsync(x =>
            x.UserId == log.UserId &&
            x.Action == log.Action &&
            x.Target == log.Target &&
            x.Metadata == log.Metadata &&
            EF.Functions.DateDiffSecond(x.Timestamp, now) < 3
        );
    }
}