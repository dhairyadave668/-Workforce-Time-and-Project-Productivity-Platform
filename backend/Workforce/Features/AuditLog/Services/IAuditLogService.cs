using Workforce.Features.AuditLog.DTOs;

namespace Workforce.Features.AuditLog.Services;

public interface IAuditLogService
{
    Task<List<AuditResponseDto>> GetLogsAsync();
    Task CreateLog(string entraId, CreateAuditLogDto dto);
}