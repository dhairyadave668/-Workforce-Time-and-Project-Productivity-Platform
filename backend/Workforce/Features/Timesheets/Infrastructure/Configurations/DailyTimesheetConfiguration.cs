using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workforce.Features.Timesheets.Entities;

namespace Workforce.Features.Timesheets.Infrastructure.Configurations;

public class DailyTimesheetConfiguration : IEntityTypeConfiguration<DailyTimesheet>
{
    public void Configure(EntityTypeBuilder<DailyTimesheet> builder)
    {
        // Unique daily entry
        builder.HasIndex(x => new { x.TimesheetId, x.EntryDate })
               .IsUnique();

        // Decimal precision
        builder.Property(x => x.DailyHours)
               .HasPrecision(5, 2);

        // Relationship → User
        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}