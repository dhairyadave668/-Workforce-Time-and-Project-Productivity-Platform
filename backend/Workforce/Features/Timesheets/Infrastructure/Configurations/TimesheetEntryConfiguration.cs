using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workforce.Features.Timesheets.Entities;

namespace Workforce.Features.Timesheets.Infrastructure.Configurations;

public class TimesheetEntryConfiguration : IEntityTypeConfiguration<TimesheetEntry>
{
    public void Configure(EntityTypeBuilder<TimesheetEntry> builder)
    {
        // Decimal precision
        builder.Property(x => x.Hours)
               .HasPrecision(5, 2);

        // Check constraint
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_TimesheetEntry_Hours",
            "Hours <= 2.5"));

        // Relationship → DailyTimesheet
        builder.HasOne(x => x.DailyTimesheet)
               .WithMany(x => x.Entries)
               .HasForeignKey(x => x.DailyTimesheetId)
               .OnDelete(DeleteBehavior.Cascade);

        // Relationship → User
        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Restrict);

        // Relationship → Project
        builder.HasOne(x => x.Project)
               .WithMany()
               .HasForeignKey(x => x.ProjectId);

        // Relationship → Task
        builder.HasOne(x => x.Task)
               .WithMany()
               .HasForeignKey(x => x.TaskId);
    }
}