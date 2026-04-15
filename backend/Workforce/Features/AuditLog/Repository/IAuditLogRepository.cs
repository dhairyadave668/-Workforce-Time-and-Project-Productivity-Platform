using Workforce.Features.AuditLog.DTOs;
using Workforce.Infrastructure.Persistence;
using Workforce.Features.AuditLog.Entities;
namespace Workforce.Features.AuditLog.Repository;

public interface IAuditLogRepository
{
    Task<List<AuditResponseDto>> GetLogsAsync();
    Task AddLogAsync(Entities.AuditLog log);      // ✅ fully qualified
    Task<bool> LogExistsAsync(Entities.AuditLog log, DateTime now);
}