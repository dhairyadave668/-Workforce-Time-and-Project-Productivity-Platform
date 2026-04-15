namespace Workforce.Features.Identity.DTOs;

public class UserResponse
{
    public Guid Id { get; set; }

    public string EntraId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
    public Guid RoleId { get; set; }   // ✅ NEW
    public DateTime CreatedOn { get; set; }
}