using System.ComponentModel.DataAnnotations;
using Workforce.Features.Identity.Entities;

namespace Workforce.Features.AuditLog.Entities;

public class AuditLog
{
    [Key]
    public Guid Id { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = null!;

    [MaxLength(255)]
    public string? Target { get; set; }

    [MaxLength(255)]
    public string? Metadata { get; set; }

    public Guid? RoleId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Role? Role { get; set; }
    public User? User { get; set; }
}