using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Workforce.Features.Identity.Entities;

namespace Workforce.Features.Timesheets.Entities;

public class DailyTimesheet
{
    [Key]
    public Guid Id { get; set; }

    public Guid TimesheetId { get; set; }

    public Guid? UserId { get; set; }

    public DateTime EntryDate { get; set; }

    public decimal DailyHours { get; set; }

    public string Status { get; set; } = "draft";

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? AdminRemarks { get; set; }

    public DateTime Created_On { get; set; } = DateTime.UtcNow;

    // Navigation
 

    public User? User { get; set; }

    public ICollection<TimesheetEntry>? Entries { get; set; }
}