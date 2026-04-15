using System.ComponentModel.DataAnnotations;

namespace Workforce.Features.Projects.Entities;

public class ProjectTask
{
    [Key]
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Priority { get; set; }

    public string Status { get; set; } = null!;

    public Guid? ProjectId { get; set; }

    public decimal Task_Hours { get; set; }

    public Guid? CategoryId { get; set; }

    public Guid? AssignedTo { get; set; }

    public Guid Created_By { get; set; }

    public DateTime Created_On { get; set; } = DateTime.UtcNow;

    public Guid? Updated_By { get; set; }

    public DateTime Updated_On { get; set; } = DateTime.UtcNow;

    public bool Is_Deleted { get; set; }
}
