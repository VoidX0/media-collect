using MailKit.Net.Smtp;
using MailKit.Security;
using MediaCollect.Core.Models.Common;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;
using MimeKit;

namespace MediaCollect.Services;

/// <summary>
/// SMTP邮箱服务
/// </summary>
public class SmtpService
{
    /// <summary>
    /// 配置信息
    /// </summary>
    private SmtpOptions Options { get; }

    /// <summary>
    /// 构造函数
    /// </summary>
    public SmtpService(IOptions<SmtpOptions> options)
    {
        Options = options.Value;
    }

    /// <summary>
    /// 发送消息
    /// </summary>
    /// <param name="template">选择模板</param>
    /// <param name="emails">收件人</param>
    /// <param name="parameters">模板参数</param>
    /// <returns></returns>
    public async Task<OperateResult> SendMessage(Func<SmtpOptions, string> template,
        List<string> emails, Dictionary<string, string> parameters)
    {
        if (emails.Count == 0) return OperateResult.Fail("收件人列表不能为空");
        // 处理模板和内容
        var bodyContent = template(Options);
        bodyContent = parameters.Aggregate(bodyContent,
            (current, parameter) => current.Replace($"${parameter.Key}", parameter.Value));

        try
        {
            // 构建 MimeMessage 对象
            var message = new MimeMessage();
            // 发件人
            message.From.Add(new MailboxAddress(Options.Username, Options.Username));
            // 收件人
            foreach (var email in emails)
            {
                message.To.Add(new MailboxAddress(email, email));
            }

            // 主题
            message.Subject = Options.Title;
            // 构建正文
            var bodyBuilder = new BodyBuilder
            {
                // HtmlBody = bodyContent,
                TextBody = bodyContent
            };
            message.Body = bodyBuilder.ToMessageBody();
            // 发送
            using var client = new SmtpClient();
            // 设置超时
            client.Timeout = 10000;
            // A. 连接
            // SecureSocketOptions.Auto 会根据端口自动尝试 StartTLS 或 SSL
            var socketOptions = Options.EnableSsl ? SecureSocketOptions.Auto : SecureSocketOptions.None;
            await client.ConnectAsync(Options.Server, Options.Port, socketOptions);
            // B. 认证
            if (!string.IsNullOrEmpty(Options.Username) && !string.IsNullOrEmpty(Options.Password))
            {
                await client.AuthenticateAsync(Options.Username, Options.Password);
            }

            // C. 发送
            await client.SendAsync(message);
            // D. 断开连接 (true 表示发送 QUIT 命令)
            await client.DisconnectAsync(true);
            return OperateResult.Success();
        }
        catch (Exception ex)
        {
            return OperateResult.Fail($"邮件发送失败: {ex.Message}", ex);
        }
    }
}