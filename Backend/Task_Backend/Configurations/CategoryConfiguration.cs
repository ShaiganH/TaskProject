using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Project.Model;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.Id);

        builder.HasKey(c => c.Id);

        builder.HasOne(c => c.CreatedBy)
         .WithMany()
         .HasForeignKey(c => c.CreatedByUserId)
         .OnDelete(DeleteBehavior.Restrict);

        builder.Property(c => c.Name).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Color).HasMaxLength(20);
    }
}