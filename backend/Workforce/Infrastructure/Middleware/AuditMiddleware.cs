using System.Security.Claims;
using Workforce.Infrastructure.Persistence;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.AuditLog.DTOs;
public class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, AuditLogService auditLogService)
    {
        await _next(context);

        // ❌ Skip manual
        if (context.Items.ContainsKey("SkipAudit"))
            return;

        var method = context.Request.Method;

        // ✅ ONLY CREATE / UPDATE / DELETE
        bool isWrite =
            method == HttpMethods.Post ||
            method == HttpMethods.Put ||
            method == HttpMethods.Delete;

        if (!isWrite)
            return;

        // ================= USER =================
        var entraId =
            context.User.FindFirst("oid")?.Value ??
            context.User.FindFirst("sub")?.Value ??
            context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            "Unknown";

        // ================= ACTION =================
        var module = context.Items["AuditModule"]?.ToString();
        var status = context.Items["AuditStatus"]?.ToString();

        if (string.IsNullOrEmpty(module) || string.IsNullOrEmpty(status))
            return;

        var action = $"{module} {status}";

        // ✅ TAKE METADATA FROM ENDPOINT ONLY
        var metadata = context.Items["AuditMetadata"]?.ToString();

        if (string.IsNullOrEmpty(metadata))
            return;

        // ================= SAVE =================
        await auditLogService.CreateLog(entraId, new CreateAuditLogDto
        {
            Action = action,
            Target = context.Request.Path,
            Metadata = metadata
        });
    }
}