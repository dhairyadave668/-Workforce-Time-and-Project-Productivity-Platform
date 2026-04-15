namespace Workforce.Features.Projects.Entities;

public class TaskCategory
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public DateTime Created_On { get; set; } = DateTime.UtcNow;

    public bool Is_Deleted { get; set; } = false;
}