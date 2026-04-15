namespace Workforce.Features.AuditLog.DTOs;

public class AuditResponseDto
{
    public Guid Id { get; set; }
    public string Timestamp { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string Action { get; set; } = default!;
    public string Target { get; set; } = default!;
    public string Metadata { get; set; } = default!;
    public string RoleId { get; set; } = default!;
    public string RoleName { get; set; } = string.Empty;
}