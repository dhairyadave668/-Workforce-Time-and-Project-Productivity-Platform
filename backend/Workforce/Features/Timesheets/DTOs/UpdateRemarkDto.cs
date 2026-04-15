namespace Workforce.Features.Timesheets.DTOs
{
    public class UpdateRemarkDto
    {
        public Guid TimesheetId { get; set; }
        public DateTime? EntryDate { get; set; } 
        public string AdminRemarks { get; set; } = "";
        public string? UserName { get; set; }
        public string? Email { get; set; }

        public string? entraId { get; set; }

    }
}
