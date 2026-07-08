using System.Text.Json;
using MediaCollect.Core.Models.Common;
using MediaCollect.Models;
using RestSharp;

namespace MediaCollect.Services;

/// <summary>
/// Apple Music服务
/// </summary>
public class AppleMusicService
{
    private readonly RestClient _client;

    private readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true // 忽略属性名大小写
    };

    /// <summary>
    /// 构造函数
    /// </summary>
    public AppleMusicService()
    {
        _client = new RestClient("https://itunes.apple.com");
    }

    /// <summary>
    /// 获取艺术家信息
    /// </summary>
    /// <param name="name">艺术家名称</param>
    /// <param name="country">限制国家</param>
    /// <returns></returns>
    public async Task<OperateResult<AppleMusicArtist>> GetArtist(string name, string? country = "cn")
    {
        var request = new RestRequest("search");
        request.AddQueryParameter("entity", "musicArtist");
        request.AddQueryParameter("term", name);
        request.AddQueryParameter("limit", 1);
        if (!string.IsNullOrWhiteSpace(country)) request.AddQueryParameter("country", country);
        // 发起请求
        try
        {
            var response = await _client.ExecuteAsync(request);
            if (!response.IsSuccessful || string.IsNullOrWhiteSpace(response.Content))
                return OperateResult<AppleMusicArtist>.Fail("No found artist");
            var res = JsonSerializer.Deserialize<AppleMusicArtistResponse>(response.Content, _jsonSerializerOptions);
            return res?.Results.Length > 0
                ? OperateResult<AppleMusicArtist>.Success(res.Results[0])
                : OperateResult<AppleMusicArtist>.Fail("No found artist");
        }
        catch (Exception e)
        {
            return OperateResult<AppleMusicArtist>.Fail(e.Message);
        }
    }

    /// <summary>
    /// 获取指定艺术家名下的所有专辑
    /// </summary>
    /// <param name="artistId">艺术家唯一 ID</param>
    public async Task<OperateResult<List<AppleMusicAlbum>>> GetAlbums(long artistId)
    {
        var request = new RestRequest("lookup");
        request.AddQueryParameter("id", artistId.ToString());
        request.AddQueryParameter("entity", "album");
        request.AddQueryParameter("limit", 500);
        // 发起请求
        try
        {
            var response = await _client.ExecuteAsync(request);
            if (!response.IsSuccessful || string.IsNullOrWhiteSpace(response.Content))
                return OperateResult<List<AppleMusicAlbum>>.Fail("Failed to fetch albums");
            var res = JsonSerializer.Deserialize<AppleMusicAlbumResponse>(response.Content, _jsonSerializerOptions);
            if (res == null || res.Results.Length == 0)
                return OperateResult<List<AppleMusicAlbum>>.Fail("No albums found");
            // 只保留专辑数据
            var albums = res.Results
                .Where(x => x.WrapperType == "collection")
                .OrderByDescending(x => x.ReleaseDate)
                .ToList();

            return albums.Count > 0
                ? OperateResult<List<AppleMusicAlbum>>.Success(albums)
                : OperateResult<List<AppleMusicAlbum>>.Fail("No albums found after filtering");
        }
        catch (Exception e)
        {
            return OperateResult<List<AppleMusicAlbum>>.Fail(e.Message);
        }
    }

    /// <summary>
    /// 批量获取多个专辑下的所有歌曲
    /// </summary>
    /// <param name="collectionIds">专辑 ID 列表</param>
    public async Task<OperateResult<List<AppleMusicTrack>>> GetTracksBatch(List<long> collectionIds)
    {
        if (collectionIds.Count == 0) return OperateResult<List<AppleMusicTrack>>.Fail("CollectionIds cannot be empty");
        var allTracks = new List<AppleMusicTrack>();
        // Apple Lookup 接口每次最大支持约 150 个 ID，为安全起见以 100 为一组拆分
        const int chunkSize = 100;

        try
        {
            for (var i = 0; i < collectionIds.Count; i += chunkSize)
            {
                var chunk = collectionIds.Skip(i).Take(chunkSize).ToList();
                var idString = string.Join(",", chunk);

                var request = new RestRequest("lookup");
                request.AddQueryParameter("id", idString);
                request.AddQueryParameter("entity", "song");

                var response = await _client.ExecuteAsync(request);
                if (!response.IsSuccessful || string.IsNullOrWhiteSpace(response.Content))
                    continue; // 某一页失败则尝试继续

                var res = JsonSerializer.Deserialize<AppleMusicTrackResponse>(response.Content, _jsonSerializerOptions);
                if (res?.Results == null) continue;

                var tracks = res.Results
                    .Where(x => x.WrapperType == "track" && x.Kind == "song")
                    .ToList();

                allTracks.AddRange(tracks);
            }

            // 按专辑 ID 聚合，并在各自专辑内根据盘符和音轨排序
            var sortedTracks = allTracks
                .OrderBy(x => x.CollectionId)
                .ThenBy(x => x.DiscNumber)
                .ThenBy(x => x.TrackNumber)
                .ToList();

            return sortedTracks.Count > 0
                ? OperateResult<List<AppleMusicTrack>>.Success(sortedTracks)
                : OperateResult<List<AppleMusicTrack>>.Fail("No tracks found across all collections");
        }
        catch (Exception e)
        {
            return OperateResult<List<AppleMusicTrack>>.Fail(e.Message);
        }
    }
}