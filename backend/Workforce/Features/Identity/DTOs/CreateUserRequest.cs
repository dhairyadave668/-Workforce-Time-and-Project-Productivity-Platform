namespace Workforce.Features.Identity.DTOs;

public class CreateUserRequest
{
    public string EmployeeId { get; set; } = "";

    public string Name { get; set; } = "";

    public string Email { get; set; } = "";

    public string Role { get; set; } = "Employee";
}