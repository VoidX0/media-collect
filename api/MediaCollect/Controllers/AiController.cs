using MediaCollect.Models;
using MediaCollect.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediaCollect.Controllers;

/// <summary>
/// Ai相关功能
/// </summary>
[ApiController]
[Route("[controller]/[action]")]
public class AiController : ControllerBase
{
    private readonly AiService _aiService;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="aiService"></param>
    public AiController(AiService aiService)
    {
        _aiService = aiService;
    }

    /// <summary>
    /// 流式对话接口
    /// </summary>
    /// <param name="messages">对话历史列表</param>
    /// <returns></returns>
    [HttpPost]
    public async Task Chat(List<ChatMessage> messages)
    {
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        await using var upstream = await _aiService.CreateChatStreamAsync(messages, HttpContext.RequestAborted);
        using var reader = new StreamReader(upstream);
        while (await reader.ReadLineAsync() is { } line)
        {
            // 透传
            await Response.WriteAsync(line + "\n");
            await Response.Body.FlushAsync();
        }
    }

    /// <summary>
    /// Schema AI 流式接口
    /// </summary>
    [HttpPost]
    public async Task SchemaChat(SchemaAiRequest request)
    {
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        // 注入 system prompt
        var messages = new List<ChatMessage>
        {
            new() { Role = "system", Content = request.GenerateSystemPrompt() }
        };
        messages.AddRange(request.Messages);

        await using var upstream = await _aiService.CreateChatStreamAsync(messages, HttpContext.RequestAborted);
        using var reader = new StreamReader(upstream);
        while (await reader.ReadLineAsync() is { } line)
        {
            // 透传
            await Response.WriteAsync(line + "\n");
            await Response.Body.FlushAsync();
        }
    }
}