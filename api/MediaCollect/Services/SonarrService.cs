using MediaCollect.Core.Models.Common;
using MediaCollect.Models;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;
using RestSharp;

namespace MediaCollect.Services;

/// <summary>
/// Sonarr服务
/// </summary>
public class SonarrService
{
    private readonly RestClient _client;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="options"></param>
    public SonarrService(IOptions<SonarrOptions> options)
    {
        var opt = options.Value;
        _client = new RestClient(opt.BaseUrl);
        _client.AddDefaultHeader("X-Api-Key", opt.ApiKey);
    }

    /// <summary>
    /// 获取所有series
    /// </summary>
    /// <returns></returns>
    public async Task<OperateResult<List<SonarrSeries>>> GetSeries()
    {
        var request = new RestRequest("/api/v3/series");
        try
        {
            var response = await _client.GetAsync<List<SonarrSeries>>(request);
            return response is null
                ? throw new Exception("response is empty")
                : OperateResult<List<SonarrSeries>>.Success(response);
        }
        catch (Exception ex)
        {
            return OperateResult<List<SonarrSeries>>.Fail(ex.Message, ex);
        }
    }

    /// <summary>
    /// 获取指定seriesId的所有episodes
    /// </summary>
    /// <param name="seriesId"></param>
    /// <returns></returns>
    public async Task<OperateResult<List<SonarrEpisode>>> GetEpisodes(int seriesId)
    {
        var request = new RestRequest($"/api/v3/episode?seriesId={seriesId}");
        try
        {
            var response = await _client.GetAsync<List<SonarrEpisode>>(request);
            return response is null
                ? throw new Exception("response is empty")
                : OperateResult<List<SonarrEpisode>>.Success(response);
        }
        catch (Exception ex)
        {
            return OperateResult<List<SonarrEpisode>>.Fail(ex.Message, ex);
        }
    }

    /// <summary>
    /// 刷新series信息
    /// </summary>
    /// <param name="seriesId"></param>
    /// <returns></returns>
    public async Task<OperateResult> RefreshSeries(int seriesId)
    {
        var request = new RestRequest("/api/v3/command");
        request.AddJsonBody(new { name = "RefreshSeries", seriesId });
        try
        {
            var response = await _client.PostAsync(request);
            return response.IsSuccessful
                ? OperateResult.Success()
                : OperateResult.Fail($"Error: {response.StatusCode} - {response.Content}");
        }
        catch (Exception ex)
        {
            return OperateResult.Fail(ex.Message, ex);
        }
    }

    /// <summary>
    /// 获取需要重命名的文件
    /// </summary>
    /// <param name="seriesId"></param>
    /// <returns></returns>
    public async Task<OperateResult<List<SonarrRename>>> GetRenameEpisode(int seriesId)
    {
        var request = new RestRequest($"/api/v3/rename?seriesId={seriesId}");
        try
        {
            var response = await _client.GetAsync<List<SonarrRename>>(request);
            return response is null
                ? throw new Exception("response is empty")
                : OperateResult<List<SonarrRename>>.Success(response);
        }
        catch (Exception ex)
        {
            return OperateResult<List<SonarrRename>>.Fail(ex.Message, ex);
        }
    }

    /// <summary>
    /// 重命名指定剧集的文件
    /// </summary>
    /// <param name="seriesId"></param>
    /// <param name="episodeFileIds"></param>
    /// <returns></returns>
    public async Task<OperateResult> RenameEpisodeFiles(int seriesId, List<int> episodeFileIds)
    {
        var request = new RestRequest("/api/v3/command");
        request.AddJsonBody(new { name = "RenameFiles", seriesId, files = episodeFileIds });
        try
        {
            var response = await _client.PostAsync(request);
            return response.IsSuccessful
                ? OperateResult.Success()
                : OperateResult.Fail($"Error: {response.StatusCode} - {response.Content}");
        }
        catch (Exception ex)
        {
            return OperateResult.Fail(ex.Message, ex);
        }
    }
}