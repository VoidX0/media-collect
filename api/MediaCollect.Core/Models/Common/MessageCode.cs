using System.ComponentModel;

namespace MediaCollect.Core.Models.Common;

/// <summary>
/// 附带参数的消息
/// </summary>
public class MessageCode
{
    /// <summary>
    /// 消息代码索引
    /// </summary>
    public MessageCodeEnum CodeIndex { get; set; }

    /// <summary>
    /// 消息代码
    /// </summary>
    public string Code { get; set; }

    /// <summary>
    /// 参数列表
    /// </summary>
    public object[]? Args { get; set; }

    /// <summary>
    /// 默认消息
    /// </summary>
    public string Message { get; set; }

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="code"></param>
    /// <param name="args"></param>
    public MessageCode(MessageCodeEnum code, params object[] args)
    {
        CodeIndex = code;
        Code = code.ToString();
        Args = args;
        Message = Translate(code, args);
    }

    private static string Translate(MessageCodeEnum code, object[] args)
    {
        var type = code.GetType();
        var name = Enum.GetName(type, code);
        var field = type.GetField(name!);
        var attr = field?
            .GetCustomAttributes(typeof(DescriptionAttribute), false)
            .Cast<DescriptionAttribute>().FirstOrDefault();

        var template = attr?.Description ?? name ?? string.Empty; // 没找到 Description 就用枚举名
        try
        {
            return string.Format(template, args); // 自动填充 {0}, {1}
        }
        catch
        {
            return template; // 防止参数个数不匹配导致报错
        }
    }
}