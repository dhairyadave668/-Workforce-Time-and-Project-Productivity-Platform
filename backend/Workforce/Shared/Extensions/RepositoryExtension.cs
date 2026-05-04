using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Workforce.Features.AuditLog.Repository;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.Identity.Infrastructure;
using Workforce.Features.Identity.Repository;

using Workforce.Features.Projects.Repository;
using Workforce.Features.Timesheets.Infrastructure;
using Workforce.Features.Timesheets.Repository;
using Workforce.Infrastructure.Persistence;

namespace Workforce.Shared.Extensions;

public static class RepositoryExtensions
{
    public static IServiceCollection AddDatabaseAndRepositories(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ========================
        // DATABASE
        // ========================
        services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        // ========================
        // REPOSITORIES
        // ========================
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<ITimesheetRepository, TimesheetRepository>();
        services.AddScoped<IProjectTaskRepository, ProjectTaskRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        // Audit Log DI
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        return services;
    }
}