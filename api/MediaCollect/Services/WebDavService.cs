using System.Net;
using MediaCollect.Core.Models.Common;
using MediaCollect.Models;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;
using WebDav;

namespace MediaCollect.Services;

/// <summary>
/// WebDAV服务
/// </summary>
public class WebDavService
{
    private readonly WebDavOptions _options;
    private readonly WebDavClient _client;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="options"></param>
    public WebDavService(IOptions<WebDavOptions> options)
    {
        _options = options.Value;
        var param = new WebDavClientParams
        {
            BaseAddress = new Uri(_options.Uri),
            Credentials = new NetworkCredential(_options.Username, _options.Password)
        };
        _client = new WebDavClient(param);
    }

    /// <summary>
    /// 获取指定目录下的资源列表
    /// </summary>
    /// <param name="path">指定目录</param>
    /// <returns></returns>
    public async Task<OperateResult<List<WebDavItem>>> List(string? path = null)
    {
        var targetPath = path ?? _options.MediaDirectory;
        var response = await _client.Propfind(targetPath);
        if (!response.IsSuccessful)
            return OperateResult<List<WebDavItem>>.Fail($"获取列表失败: {response.StatusCode}");
        // 标准化目标路径用于比较
        var normalizedTargetPath = Uri.UnescapeDataString(targetPath).Trim('/').ToLower();
        var result = response.Resources
            .Select(x =>
            {
                var decodedUri = Uri.UnescapeDataString(x.Uri ?? "");
                return new WebDavItem
                {
                    Path = decodedUri,
                    Name = x.DisplayName ?? decodedUri.TrimEnd('/').Split('/').Last(),
                    ContentLength = x.ContentLength,
                    IsCollection = x.IsCollection,
                    LastModifiedDate = x.LastModifiedDate
                };
            })
            // 过滤掉当前目录自身
            .Where(x => !x.Path.Trim('/').Equals(normalizedTargetPath, StringComparison.CurrentCultureIgnoreCase))
            .ToList();

        return OperateResult<List<WebDavItem>>.Success(result);
    }

    /// <summary>
    /// 下载文件
    /// </summary>
    /// <param name="remoteFilePath">远程文件路径</param>
    /// <param name="localFilePath">本地文件路径</param>
    /// <param name="onStart">下载开始回调</param>
    /// <param name="onProgress">下载进度回调，参数为百分比（0-100），如果无法计算进度则为-1</param>
    /// <param name="onComplete">下载完成回调</param>
    /// <param name="onError">下载错误回调，参数为异常对象</param>
    /// <returns></returns>
    public async Task<OperateResult> Download(string remoteFilePath, string localFilePath, Action? onStart = null,
        Action<double>? onProgress = null, Action? onComplete = null, Action<Exception>? onError = null)
    {
        if (remoteFilePath.EndsWith($"/")) return OperateResult.Fail("无法下载目录，请提供文件路径");
        try
        {
            // 获取文件元数据以获取总大小
            var propResponse = await _client.Propfind(remoteFilePath);
            if (!propResponse.IsSuccessful)
                return OperateResult.Fail($"无法获取文件信息，下载取消: {propResponse.StatusCode}");
            // 获取匹配的资源
            var resource = propResponse.Resources.FirstOrDefault();
            var totalSize = resource?.ContentLength;
            // 获取文件总大小成功
            using var response = await _client.GetRawFile(remoteFilePath);
            if (!response.IsSuccessful)
                return OperateResult.Fail($"下载失败: {response.StatusCode}");
            // 开始下载
            onStart?.Invoke();
            await using (var fs = new FileStream(localFilePath, FileMode.Create))
            {
                var buffer = new byte[81920]; // 80KB 缓冲区
                long totalRead = 0;
                int read;

                while ((read = await response.Stream.ReadAsync(buffer)) > 0)
                {
                    await fs.WriteAsync(buffer.AsMemory(0, read));
                    totalRead += read;

                    if (totalSize is > 0)
                    {
                        var percentage = (double)totalRead / totalSize.Value * 100;
                        onProgress?.Invoke(percentage);
                    }
                    else
                    {
                        onProgress?.Invoke(-1); // -1表示无法计算进度
                    }
                }
            }

            onComplete?.Invoke();
            return OperateResult.Success();
        }
        catch (Exception ex)
        {
            onError?.Invoke(ex);
            return OperateResult.Fail($"下载过程中发生错误: {ex.Message}");
        }
    }

    /// <summary>
    /// 下载文件到临时文件，下载完成后再重命名为目标文件
    /// </summary>
    /// <param name="remoteFilePath">远程文件路径</param>
    /// <param name="localFilePath">本地文件路径</param>
    /// <param name="onStart">下载开始回调</param>
    /// <param name="onProgress">下载进度回调，参数为百分比（0-100），如果无法计算进度则为-1</param>
    /// <param name="onComplete">下载完成回调</param>
    /// <param name="onError">下载错误回调，参数为异常对象</param>
    /// <returns></returns>
    public async Task<OperateResult> DownloadWithTmp(string remoteFilePath, string localFilePath,
        Action? onStart = null,
        Action<double>? onProgress = null, Action? onComplete = null, Action<Exception>? onError = null)
    {
        var tmpFilePath = localFilePath + ".tmp";
        var result = await Download(remoteFilePath, tmpFilePath, onStart, onProgress, onComplete, onError);
        if (result.IsSuccess)
        {
            try
            {
                if (File.Exists(localFilePath))
                    File.Delete(localFilePath);
                File.Move(tmpFilePath, localFilePath);
            }
            catch (Exception ex)
            {
                return OperateResult.Fail($"下载完成但无法重命名临时文件: {ex.Message}");
            }
        }
        else
        {
            // 下载失败，删除临时文件
            if (File.Exists(tmpFilePath))
                File.Delete(tmpFilePath);
        }

        return result;
    }
}