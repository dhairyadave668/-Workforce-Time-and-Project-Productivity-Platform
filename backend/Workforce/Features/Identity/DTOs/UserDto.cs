namespace Workforce.Features.Identity.DTOs;

public class UserDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = "";

    public string Email { get; set; } = "";

    public string Role { get; set; } = "";

    public DateTime CreatedOn { get; set; }
}