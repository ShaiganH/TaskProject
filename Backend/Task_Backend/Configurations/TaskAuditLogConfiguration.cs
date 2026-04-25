using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Project.Model;

public class TaskAuditLogConfiguration : IEntityTypeConfiguration<TaskAuditLog>
{
    public void Configure(EntityTypeBuilder<TaskAuditLog> builder)
    {

        builder.HasKey(a => a.Id);

        builder.HasOne(a => a.Task)
         .WithMany(t => t.AuditLogs)
         .HasForeignKey(a => a.TaskId)
         .OnDelete(DeleteBehavior.Cascade);   // delete task → delete its logs

        builder.HasOne(a => a.User)
         .WithMany()
         .HasForeignKey(a => a.UserId)
         .OnDelete(DeleteBehavior.Restrict);
    }
}