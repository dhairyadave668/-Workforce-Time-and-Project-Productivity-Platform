namespace Workforce.Features.AuditLog.DTOs;

public class CreateAuditLogDto
{
    public string Action { get; set; } = string.Empty;
    public string? Target { get; set; }
    public string? Metadata { get; set; }
    public Guid? RoleId { get; set; }
}