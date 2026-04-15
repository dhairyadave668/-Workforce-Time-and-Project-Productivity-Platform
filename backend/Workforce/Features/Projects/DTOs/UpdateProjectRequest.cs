namespace Workforce.Features.Projects.DTOs;

public record UpdateProjectRequest(
    string? Name,
    string? Client,
    string? Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? PlannedHours,
    string? Description,
    string? Color,
    Guid? UpdatedBy,
    List<MemberAllocationDto>? MemberAllocations
);