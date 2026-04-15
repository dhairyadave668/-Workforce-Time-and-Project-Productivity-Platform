using Workforce.Features.Identity.Entities;
namespace Workforce.Features.Projects.DTOs
{
    public record MemberAllocationDto(
     Guid UserId,
     decimal Hours
 );
}
