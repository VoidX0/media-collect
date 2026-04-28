using SqlSugar;

namespace MediaCollect.Core.Models.Db;

[SugarTable(TableDescription = "角色授权")]
public class SystemGrantRole
{
    [SugarColumn(ColumnDescription = "角色ID", IsPrimaryKey = true)]
    public long RoleId { get; set; }

    [SugarColumn(ColumnDescription = "控制器ID", IsPrimaryKey = true)]
    public long ControllerId { get; set; }
}