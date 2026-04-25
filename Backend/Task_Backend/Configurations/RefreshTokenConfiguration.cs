using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Project.Model;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(r => r.Id);

        builder.HasIndex(r => r.TokenHashed).IsUnique(false);

        builder.HasIndex(r => r.UserId);

        builder.Property(r => r.TokenHashed)
            .HasMaxLength(500);

        builder.HasOne(r => r.User)
            .WithMany(u => u.RefreshToken)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}