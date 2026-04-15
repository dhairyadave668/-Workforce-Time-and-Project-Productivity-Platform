namespace Workforce.Features.Timesheets.DTOs
{
    public class TimesheetHistoryDto
    {
        public Guid Id { get; set; }
        public Guid TimesheetId { get; set; }
        public DateTime EntryDate { get; set; }
        public string? Status { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? AdminRemarks { get; set; }
    }
}
