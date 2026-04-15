using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Workforce.Features.Identity.Entities;
public class User
{
    public Guid Id { get; set; }
    public string? PasswordHash { get; set; }
    public string? EntraId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    public Guid RoleId { get; set; }

    [ForeignKey("RoleId")]
    public Role Role { get; set; } = default!;

    // Audit Fields
    public Guid? CreatedBy { get; set; }
    public User? CreatedByUser { get; set; }

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public Guid? UpdatedBy { get; set; }
    public User? UpdatedByUser { get; set; }

    public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; } = false;
}