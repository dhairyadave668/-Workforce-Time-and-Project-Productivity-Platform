using Microsoft.EntityFrameworkCore;
using Workforce.Features.Identity.Entities;
using Workforce.Features.Projects.Entities;
using Workforce.Features.Timesheets.Entities;
using Workforce.Features.AuditLog.Entities;

namespace Workforce.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    // For runtime DI
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // For design-time migrations (EF Core tools)
    public AppDbContext() { }

    //// ?? ADD THIS METHOD ??
    //protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    //{
    //    if (!optionsBuilder.IsConfigured)
    //    {
    //        optionsBuilder.UseSqlServer("Server=localhost,1433;Database=WorkforceDb1;User Id=sa;Password=StrongPass@123456;TrustServerCertificate=True;");
    //    }
    //}

    // ========================
    // Identity Module
    // ========================
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();

    // ========================
    // Projects Module
    // ========================
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<ProjectTask> ProjectTasks => Set<ProjectTask>();
    public DbSet<TaskCategory> TaskCategories => Set<TaskCategory>();

    // ========================
    // Timesheets Module
    // ========================
    public DbSet<DailyTimesheet> DailyTimesheets => Set<DailyTimesheet>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();

    // ========================
    // AuditLog Module
    // ========================
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureIdentity(modelBuilder);
        ConfigureProjects(modelBuilder);
        ConfigureTimesheets(modelBuilder);
        ConfigureAuditLog(modelBuilder);
    }

    private static void ConfigureIdentity(ModelBuilder modelBuilder)
    {
        // Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.RoleName)
                .IsRequired()
                .HasMaxLength(50);
            entity.HasIndex(r => r.RoleName).IsUnique();
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);
            entity.HasIndex(u => u.Email).IsUnique();

            // Role FK
            entity.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Self references (CreatedBy / UpdatedBy)
            entity.HasOne(u => u.CreatedByUser)
                .WithMany()
                .HasForeignKey(u => u.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(u => u.UpdatedByUser)
                .WithMany()
                .HasForeignKey(u => u.UpdatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(u => u.CreatedOn)
                .HasDefaultValueSql("GETUTCDATE()");
            entity.Property(u => u.UpdatedOn)
                .HasDefaultValueSql("GETUTCDATE()");
            entity.Property(u => u.IsDeleted)
                .HasDefaultValue(false);
        });
    }

    private static void ConfigureProjects(ModelBuilder modelBuilder)
    {
        // Project
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(150);
            entity.Property(p => p.Client).HasMaxLength(200);
            entity.Property(p => p.Status).IsRequired().HasMaxLength(20);
            entity.Property(p => p.Color).HasMaxLength(7);
            entity.Property(p => p.PlannedHours).HasPrecision(10, 2);
            entity.Property(p => p.LoggedHrs).HasPrecision(10, 2).HasDefaultValue(0);
            entity.Property(p => p.Description).HasColumnType("text");

            entity.HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.UpdatedByUser)
                .WithMany()
                .HasForeignKey(p => p.UpdatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ProjectAssignment
        modelBuilder.Entity<ProjectAssignment>(entity =>
        {
            entity.HasKey(pa => pa.Id);
            entity.HasIndex(pa => new { pa.ProjectId, pa.UserId }).IsUnique();
            entity.Property(pa => pa.EmployeeAllocatedHours)
                .HasPrecision(10, 2)
                .HasDefaultValue(0);

            entity.HasOne(pa => pa.Project)
                .WithMany(p => p.Assignments)
                .HasForeignKey(pa => pa.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pa => pa.User)
                .WithMany()
                .HasForeignKey(pa => pa.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(pa => pa.Role)
                .WithMany()
                .HasForeignKey(pa => pa.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(pa => pa.AssignedAt)
                .HasDefaultValueSql("GETUTCDATE()");
        });

        // ProjectTask
        modelBuilder.Entity<ProjectTask>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Task_Hours).HasPrecision(10, 2);
        });

        // TaskCategory
        modelBuilder.Entity<TaskCategory>(entity =>
        {
            entity.HasKey(tc => tc.Id);
            entity.Property(tc => tc.Name).IsRequired().HasMaxLength(100);
        });
    }

    private static void ConfigureTimesheets(ModelBuilder modelBuilder)
    {
        // DailyTimesheet
        modelBuilder.Entity<DailyTimesheet>(entity =>
        {
            entity.HasKey(dt => dt.Id);
            entity.HasIndex(dt => new { dt.UserId, dt.EntryDate }).IsUnique();
            entity.Property(dt => dt.DailyHours).HasPrecision(5, 2);
            entity.Property(dt => dt.Status).HasMaxLength(20);

            entity.HasOne(dt => dt.User)
                .WithMany()
                .HasForeignKey(dt => dt.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // TimesheetEntry
        modelBuilder.Entity<TimesheetEntry>(entity =>
        {
            entity.HasKey(te => te.Id);
            entity.Property(te => te.Hours).HasPrecision(5, 2);
            entity.ToTable(t => t.HasCheckConstraint("CK_TimesheetEntry_Hours", "Hours <= 24"));

            entity.HasOne(te => te.DailyTimesheet)
                .WithMany(dt => dt.Entries)
                .HasForeignKey(te => te.DailyTimesheetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(te => te.User)
                .WithMany()
                .HasForeignKey(te => te.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(te => te.Project)
                .WithMany()
                .HasForeignKey(te => te.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(te => te.Task)
                .WithMany()
                .HasForeignKey(te => te.TaskId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureAuditLog(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(al => al.Id);
            entity.Property(al => al.Action).IsRequired().HasMaxLength(50);
            entity.Property(al => al.Target).HasMaxLength(255);
            entity.Property(al => al.Metadata).HasMaxLength(255);
            entity.HasIndex(al => al.Timestamp);

            entity.HasOne(al => al.User)
                .WithMany()
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(al => al.Role)
                .WithMany()
                .HasForeignKey(al => al.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}