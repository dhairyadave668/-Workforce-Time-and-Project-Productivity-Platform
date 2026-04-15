using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Projects.Entities;

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = null!;

    public string? Client { get; set; }

    public string Status { get; set; } = null!; // "Active", "Completed", "OnHold", "Planning"

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public decimal PlannedHours { get; set; }

    public decimal LoggedHrs { get; set; }

    public string? Description { get; set; }

    public string? Color { get; set; }

    public Guid? CreatedBy { get; set; }

    public Guid? UpdatedBy { get; set; }

    public User? CreatedByUser { get; set; }

    public User? UpdatedByUser { get; set; }

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedOn { get; set; }

    public bool IsDeleted { get; set; } = false;
    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
    public ICollection<ProjectAssignment> Assignments { get; set; } = new List<ProjectAssignment>();
}

// Optional enum for consistency
public enum ProjectStatus
{
    Active,
    Completed,
    OnHold,
    Planning
}