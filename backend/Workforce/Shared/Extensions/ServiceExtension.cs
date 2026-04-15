using Microsoft.Extensions.DependencyInjection;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.Identity.Services;
using Workforce.Features.Projects.Services;
using Workforce.Features.Reports.Services;
using Workforce.Features.Timesheets.Services;
using Workforce.Infrastructure.Services;

namespace Workforce.Shared.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // External services
        services.AddScoped<GraphService>();

        // JWT Service (needs JwtSettings – configure in Program.cs)
        services.AddScoped<IJwtService, JwtService>();

        // Identity Services
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuthService, AuthService>();

        // Timesheet Services
        services.AddScoped<IApprovalService, ApprovalService>();
        services.AddScoped<IDailyTimesheetService, DailyTimesheetService>();

        // Project Services
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IProjectTaskService, ProjectTaskService>();

        // Reports Services
        services.AddScoped<IReportsService, ReportsService>();

        // AuditLog Services
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<AuditLogService>();  // concrete for endpoints that need it

        return services;
    }
}