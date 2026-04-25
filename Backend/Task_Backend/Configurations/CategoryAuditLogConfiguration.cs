using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Project.Model;

public class CategoryAuditLogConfiguration : IEntityTypeConfiguration<CategoryAuditLog>
{
    public void Configure(EntityTypeBuilder<CategoryAuditLog> builder)
    {
        builder.HasKey(a => a.Id);

        // Use SetNull so deleting a category doesn't wipe its audit history
        builder.HasOne(a => a.Category)
         .WithMany()
         .HasForeignKey(a => a.CategoryId)
         .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.User)
         .WithMany()
         .HasForeignKey(a => a.UserId)
         .OnDelete(DeleteBehavior.Restrict);
    }
}