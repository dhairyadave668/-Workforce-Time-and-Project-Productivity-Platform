using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Projects.Entities;

public class ProjectAssignment
{
    public Guid Id { get; set; }
    public decimal EmployeeAllocatedHours { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? RoleId { get; set; }
    public Role? Role { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}