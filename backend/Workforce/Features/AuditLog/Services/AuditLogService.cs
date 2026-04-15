using Microsoft.EntityFrameworkCore;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.AuditLog.Repository;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Identity.Repository;
using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.AuditLog.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repository;
    private readonly IUserRepository _userRepository;

    public AuditLogService(IAuditLogRepository repository, IUserRepository userRepository)
    {
        _repository = repository;
        _userRepository = userRepository;
    }

    private static DateTime GetCurrentIndiaTime()
    {
        var indiaZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, indiaZone);
    }

    public async Task<List<AuditResponseDto>> GetLogsAsync()
    {
        return await _repository.GetLogsAsync();
    }

    public async Task CreateLog(string entraId, CreateAuditLogDto dto)
    {
        if (string.IsNullOrEmpty(entraId))
            return;

        // ✅ Use repository to fetch user (including soft-deleted, to match original behavior)
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            return;

        var now = GetCurrentIndiaTime();

        var log = new Entities.AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Action = dto.Action,
            RoleId = dto.RoleId,
            Target = dto.Target,
            Metadata = dto.Metadata,
            Timestamp = now,
            CreatedAt = now
        };

        // Prevent duplicate logs (same action, target, metadata within 3 seconds)
        var exists = await _repository.LogExistsAsync(log, now);
        if (exists)
            return;

        await _repository.AddLogAsync(log);
    }
}