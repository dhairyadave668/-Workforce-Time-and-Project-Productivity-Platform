namespace Workforce.Features.Projects.DTOs;

public class TaskResponseDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Priority { get; set; }

    public string Status { get; set; } = null!;

    public Guid? ProjectId { get; set; }

    public string? ProjectName { get; set; }

    public decimal Task_Hours { get; set; }

    public DateTime Created_On { get; set; }
    public DateTime Updated_On { get; set; }
    public Guid? Created_By { get; set; }
    public Guid? Updated_By { get; set; }
}