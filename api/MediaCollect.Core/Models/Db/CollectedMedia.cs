using SqlSugar;

namespace MediaCollect.Core.Models.Db;

[SugarTable(TableDescription = "已处理媒体")]
public class CollectedMedia
{
    [SugarColumn(ColumnDescription = "ID", IsPrimaryKey = true)]
    public long Id { get; set; }

    [SugarColumn(ColumnDescription = "开始处理时间")]
    public DateTimeOffset StartTime { get; set; } = DateTimeOffset.Now;

    [SugarColumn(ColumnDescription = "结束处理时间")]
    public DateTimeOffset? EndTime { get; set; } = DateTimeOffset.Now;

    [SugarColumn(ColumnDescription = "原始路径")]
    public string OriginalPath { get; set; } = string.Empty;

    [SugarColumn(ColumnDescription = "保存路径")]
    public string SavePath { get; set; } = string.Empty;

    [SugarColumn(ColumnDescription = "文件大小")]
    public long FileSize { get; set; }

    [SugarColumn(ColumnDescription = "文件类型")]
    public string FileType { get; set; } = string.Empty;

    [SugarColumn(ColumnDescription = "系列")]
    public string Series { get; set; } = string.Empty;

    [SugarColumn(ColumnDescription = "集数")]
    public string Episode { get; set; } = string.Empty;
}