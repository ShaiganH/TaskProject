using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Project.Model;

public class CommentsConfiguration : IEntityTypeConfiguration<TaskComment>
{
    public void Configure(EntityTypeBuilder<TaskComment> builder)
    {

        builder.HasKey(c => c.Id);

        builder.HasOne(c => c.Task)
         .WithMany(t => t.Comments)
         .HasForeignKey(c => c.TaskId)
         .OnDelete(DeleteBehavior.Cascade);   // delete task → delete its comments

        builder.HasOne(c => c.User)
         .WithMany()
         .HasForeignKey(c => c.UserId)
         .OnDelete(DeleteBehavior.Restrict);

        builder.Property(c => c.Content).HasMaxLength(2000).IsRequired();


    }
}