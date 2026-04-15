namespace Workforce.Features.Projects.DTOs;

public record AssignMembersRequest(List<Guid> UserIds);