using System.Text.Json.Serialization;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;
using RestSharp;

namespace MediaCollect.Services;

/// <summary>
/// 聊天消息模型
/// </summary>
public class ChatMessage
{
    /// <summary>
    /// 角色 (user, assistant, system)
    /// </summary>
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    /// <summary>
    /// 内容
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// AI Service
/// </summary>
public class AiService : IDisposable
{
    /// <summary>
    /// 配置选项
    /// </summary>
    private AiOptions Options { get; set; }

    /// <summary>
    /// RestClient
    /// </summary>
    private readonly RestClient _client;

    /// <summary>
    /// 是否已释放
    /// </summary>
    private bool _disposed;

    /// <summary>
    /// 构造函数
    /// </summary>
    public AiService(IOptions<AiOptions> options)
    {
        Options = options.Value;
        var baseUrl = string.IsNullOrWhiteSpace(Options.BaseUrl) ? "http://localhost" : Options.BaseUrl;
        var clientOptions = new RestClientOptions(baseUrl)
        {
            // 设置超时，防止长对话中断
            Timeout = TimeSpan.FromSeconds(Options.TimeoutSeconds)
        };
        _client = new RestClient(clientOptions);
    }

    /// <summary>
    /// 流式对话接口
    /// </summary>
    /// <param name="messages">对话历史列表</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>包含内容的流式结果</returns>
    public async Task<Stream> CreateChatStreamAsync(
        List<ChatMessage> messages,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(Options.BaseUrl) ||
            string.IsNullOrWhiteSpace(Options.ApiKey))
            throw new InvalidOperationException("BaseUrl or ApiKey is not configured.");

        var request = new RestRequest("chat/completions", Method.Post);
        request.AddHeader("Authorization", $"Bearer {Options.ApiKey}");
        request.AddHeader("Content-Type", "application/json");

        request.AddJsonBody(new
        {
            model = Options.Model,
            messages,
            stream = true,
            temperature = 0.6
        });

        // 直接返回原始响应流
        var stream = await _client.DownloadStreamAsync(request, cancellationToken);
        return stream ?? throw new Exception("Failed to get response stream from AI API.");
    }

    /// <summary>
    /// 实现 IDisposable 接口以正确释放 RestClient
    /// </summary>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// 释放资源
    /// </summary>
    /// <param name="disposing"></param>
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            // 释放 RestClient
            _client?.Dispose();
        }

        _disposed = true;
    }
}