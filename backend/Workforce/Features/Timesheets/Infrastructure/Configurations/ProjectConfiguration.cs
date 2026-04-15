using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workforce.Features.Projects.Entities;

namespace Workforce.Features.Timesheets.Infrastructure.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("Projects");
        builder.Ignore(x => x.CreatedByUser);
        builder.Ignore(x => x.UpdatedByUser);
    }
}