namespace Project.Service;
using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;

public class S3Service : IS3Service
{
    private readonly string _bucketName;
    private readonly IAmazonS3 _s3Client;
    private readonly string _region;

    public S3Service(IConfiguration config)
    {
        _bucketName = config["AWS:BucketName"]!;
        _region     = config["AWS:Region"]!;
        _s3Client   = new AmazonS3Client(
            config["AWS:AccessKey"],
            config["AWS:SecretKey"],
            RegionEndpoint.GetBySystemName(_region)
        );
    }

    public async Task<string> UploadFileAsync(IFormFile file, string userId)
    {
        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key      = $"profile-pictures/{userId}{ext}";  // overwrites old pic

        using var stream = file.OpenReadStream();

        var request = new TransferUtilityUploadRequest
        {
            InputStream  = stream,
            Key          = key,
            BucketName   = _bucketName,
            ContentType  = file.ContentType,
            CannedACL    = S3CannedACL.PublicRead,  // so URL is publicly accessible
        };

        var transferUtility = new TransferUtility(_s3Client);
        await transferUtility.UploadAsync(request);

        return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{key}";
    }

    public async Task DeleteFileAsync(string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl)) return;

        // Extract the key from the URL
        var uri = new Uri(fileUrl);
        var key = uri.AbsolutePath.TrimStart('/');

        await _s3Client.DeleteObjectAsync(_bucketName, key);
    }
}