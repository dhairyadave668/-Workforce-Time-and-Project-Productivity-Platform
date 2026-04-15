using Workforce.Features.Approvals.DTOs;
using Workforce.Features.Timesheets.DTOs;

namespace Workforce.Features.Timesheets.Services;

public interface IApprovalService
{
    Task<List<ApprovalEntryDto>> GetEntries();
    Task<(DateTime entryDate, string userName)> UpdateRemark(UpdateRemarkDto dto);
    Task<int> GetTotalRemarks();
}