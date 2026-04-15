using System.ComponentModel.DataAnnotations;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Projects.Entities;
namespace Workforce.Features.Timesheets.Entities;

public class TimesheetEntry
{
    [Key]
    public Guid Id { get; set; }

    public Guid DailyTimesheetId { get; set; }

    public Guid? UserId { get; set; }

    public Guid? ProjectId { get; set; }

    public Guid? TaskId { get; set; }

    public DateTime EntryDate { get; set; }

    public decimal Hours { get; set; }

    public string? Note { get; set; }

    public DateTime Created_On { get; set; } = DateTime.UtcNow;

    public DateTime Updated_On { get; set; } = DateTime.UtcNow;

    // Navigation
    public DailyTimesheet? DailyTimesheet { get; set; }

    public User? User { get; set; }
    public Project? Project { get; set; }
    public ProjectTask? Task { get; set; }
}