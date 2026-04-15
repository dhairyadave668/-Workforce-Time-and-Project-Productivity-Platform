namespace Workforce.Features.Projects.DTOs;

public class CreateTaskDto
{
    public string Name { get; set; } = null!;

    public string? Priority { get; set; }

    public string Status { get; set; } = "Pending";

    public Guid? ProjectId { get; set; }

    public decimal Task_Hours { get; set; }

    public Guid? CategoryId { get; set; }

    public Guid? AssignedTo { get; set; }
    public string? EntraId { get; set; }
    public Guid UserId { get; set; }
}