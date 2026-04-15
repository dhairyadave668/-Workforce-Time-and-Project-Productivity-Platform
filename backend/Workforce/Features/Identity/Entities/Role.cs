using System.ComponentModel.DataAnnotations;

namespace Workforce.Features.Identity.Entities;
public class Role {
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
}