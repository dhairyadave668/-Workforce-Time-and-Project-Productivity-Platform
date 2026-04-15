using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Workforce.Features.Identity.Settings;  
using Serilog;
using Workforce.Shared.Extensions;
using Workforce.Features.AuditLog.Endpoints;
using Workforce.Features.Identity.Endpoints;
using Workforce.Features.Identity.Services;
using Workforce.Features.Projects.Endpoints;
using Workforce.Features.Reports.Endpoints;
using Workforce.Features.Timesheets.Endpoints;
using Workforce.Infrastructure.Persistence;
using Workforce.Shared.Middlewares;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

// ========================
// DATABASE & REPOSITORIES
// ========================
builder.Services.AddDatabaseAndRepositories(builder.Configuration);

builder.Services.AddHttpContextAccessor();

// ========================
// SERVICES
// ========================
builder.Services.AddApplicationServices();

// ========================
// JWT AUTHENTICATION (replaces Entra ID)
// ========================
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>();
if (jwtSettings == null || string.IsNullOrEmpty(jwtSettings.Key))
    throw new Exception("JWT settings are missing or invalid.");

var key = Encoding.UTF8.GetBytes(jwtSettings.Key);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddScoped<IJwtService, JwtService>();

// ========================
// CORS
// ========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ========================
// SWAGGER
// ========================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ========================
// MIDDLEWARE
// ========================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Workforce API v1");
        options.RoutePrefix = string.Empty;
    });
}

app.UseMiddleware<GlobalExceptionHandler>();
app.UseSerilogRequestLogging();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<AuditMiddleware>();

// ========================
// ENDPOINTS
// ========================
app.MapProjectsWithLoggedHours();
app.MapProjectTaskEndpoints();
app.MapCreateProject();
app.MapAssignMember();
app.MapApprovalEndpoints();
app.MapDailyTimesheetEndpoints();
app.MapLoginEndpoint();
app.MapReportsEndpoints();
app.MapUserManagement();
app.MapEntraUsers();
app.MapAuditLogEndpoints();

app.MapGet("/claims", (HttpContext http) =>
{
    return http.User.Claims.Select(c => new { c.Type, c.Value });
}).RequireAuthorization();

app.MapGet("/secure", (HttpContext http, ILogger<Program> logger) =>
{
    var name = http.User.Identity?.Name;
    logger.LogInformation("Secure endpoint accessed by {User}", name);
    return $"Hello {name}";
}).RequireAuthorization();

app.MapGet("/admin", (ILogger<Program> logger) =>
{
    logger.LogInformation("Admin endpoint accessed");
    return "Admin Only";
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/employee", (ILogger<Program> logger) =>
{
    logger.LogInformation("Employee endpoint accessed");
    return "Employee or Admin";
}).RequireAuthorization(policy => policy.RequireRole("Employee", "Admin"));

app.Run();

