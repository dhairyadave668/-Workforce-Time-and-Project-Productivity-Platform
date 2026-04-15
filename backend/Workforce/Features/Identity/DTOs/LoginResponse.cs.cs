namespace Workforce.Features.Identity.DTOs;

public class LoginResponse
{
    public Guid Id { get; set; }
    public string EntraId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string Role { get; set; } = default!;
    public string Token { get; set; } = string.Empty;   // new
}