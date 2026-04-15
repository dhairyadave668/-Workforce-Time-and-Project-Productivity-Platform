namespace Workforce.Features.Projects.DTOs;

public record CreateProjectRequest(
    string Name,
    string? Client,
    string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal PlannedHours,
    string? Description,
    string? Color,
    Guid? CreatedBy,
    List<MemberAllocationDto>? MemberAllocations
);