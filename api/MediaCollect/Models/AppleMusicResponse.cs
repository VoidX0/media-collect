namespace MediaCollect.Models;

/// <summary>
/// Apple Music艺术家响应
/// </summary>
public class AppleMusicArtistResponse
{
    /// <summary>
    /// 结果数量
    /// </summary>
    public int ResultCount { get; set; }

    /// <summary>
    /// 结果
    /// </summary>
    public AppleMusicArtist[] Results { get; set; } = [];
}

/// <summary>
/// Apple Music艺术家
/// </summary>
public class AppleMusicArtist
{
    /// <summary>
    /// 艺术家名称
    /// </summary>
    public string ArtistName { get; set; } = string.Empty;

    /// <summary>
    /// 艺术家链接
    /// </summary>
    public string ArtistLinkUrl { get; set; } = string.Empty;

    /// <summary>
    /// 艺术家ID
    /// </summary>
    public long ArtistId { get; set; }

    /// <summary>
    /// 主要风格
    /// </summary>
    public string PrimaryGenreName { get; set; } = string.Empty;

    /// <summary>
    /// 主要风格ID
    /// </summary>
    public long PrimaryGenreId { get; set; }
}

/// <summary>
/// Apple Music 专辑响应实体
/// </summary>
public class AppleMusicAlbumResponse
{
    /// <summary>
    /// 结果数量
    /// </summary>
    public int ResultCount { get; set; }

    /// <summary>
    /// 结果数组
    /// </summary>
    public AppleMusicAlbum[] Results { get; set; } = [];
}

/// <summary>
/// Apple Music 专辑与艺术家
/// </summary>
public class AppleMusicAlbum
{
    /// <summary>
    /// 包装类型 ("artist" 表示艺术家，"collection" 表示专辑/集合)
    /// </summary>
    public string WrapperType { get; set; } = string.Empty;

    /// <summary>
    /// 集合类型 (例如: "Album" 或 "Single")
    /// </summary>
    public string CollectionType { get; set; } = string.Empty;

    /// <summary>
    /// 艺术家 ID
    /// </summary>
    public long ArtistId { get; set; }

    /// <summary>
    /// 专辑 ID
    /// </summary>
    public long CollectionId { get; set; }

    /// <summary>
    /// 艺术家名称
    /// </summary>
    public string ArtistName { get; set; } = string.Empty;

    /// <summary>
    /// 专辑名称
    /// </summary>
    public string CollectionName { get; set; } = string.Empty;

    /// <summary>
    /// 专辑预览链接
    /// </summary>
    public string CollectionViewUrl { get; set; } = string.Empty;

    /// <summary>
    /// 100x100 封面图片链接
    /// </summary>
    public string ArtworkUrl100 { get; set; } = string.Empty;

    /// <summary>
    /// 歌曲数量
    /// </summary>
    public int TrackCount { get; set; }

    /// <summary>
    /// 版权信息
    /// </summary>
    public string Copyright { get; set; } = string.Empty;

    /// <summary>
    /// 国家/地区
    /// </summary>
    public string Country { get; set; } = string.Empty;

    /// <summary>
    /// 发行日期
    /// </summary>
    public DateTime? ReleaseDate { get; set; }

    /// <summary>
    /// 主要流派/风格
    /// </summary>
    public string PrimaryGenreName { get; set; } = string.Empty;
}

/// <summary>
/// Apple Music 歌曲响应实体
/// </summary>
public class AppleMusicTrackResponse
{
    /// <summary>
    /// 结果数量
    /// </summary>
    public int ResultCount { get; set; }

    /// <summary>
    /// 结果数组
    /// </summary>
    public AppleMusicTrack[] Results { get; set; } = [];
}

/// <summary>
/// Apple Music 歌曲与专辑
/// </summary>
public class AppleMusicTrack
{
    /// <summary>
    /// 包装类型 ("collection" 表示专辑信息，"track" 表示单曲/音轨信息)
    /// </summary>
    public string WrapperType { get; set; } = string.Empty;

    /// <summary>
    /// 资源类型 ("song")
    /// </summary>
    public string Kind { get; set; } = string.Empty;

    /// <summary>
    /// 艺术家 ID
    /// </summary>
    public long ArtistId { get; set; }

    /// <summary>
    /// 专辑 ID
    /// </summary>
    public long CollectionId { get; set; }

    /// <summary>
    /// 歌曲 ID
    /// </summary>
    public long TrackId { get; set; }

    /// <summary>
    /// 艺术家名称
    /// </summary>
    public string ArtistName { get; set; } = string.Empty;

    /// <summary>
    /// 专辑名称
    /// </summary>
    public string CollectionName { get; set; } = string.Empty;

    /// <summary>
    /// 歌曲名称
    /// </summary>
    public string TrackName { get; set; } = string.Empty;

    /// <summary>
    /// 歌曲页面链接
    /// </summary>
    public string TrackViewUrl { get; set; } = string.Empty;

    /// <summary>
    /// 30 秒试听音频链接
    /// </summary>
    public string PreviewUrl { get; set; } = string.Empty;

    /// <summary>
    /// 音轨号
    /// </summary>
    public int TrackNumber { get; set; }

    /// <summary>
    /// 碟片号 (通常为 1，双 CD 时会有 1 和 2)
    /// </summary>
    public int DiscNumber { get; set; }

    /// <summary>
    /// 歌曲时长（毫秒）
    /// </summary>
    public long TrackTimeMillis { get; set; }

    /// <summary>
    /// 辅助计算属性：格式化为分:秒的形式 (03:45)
    /// </summary>
    public string DurationFormatted => TimeSpan.FromMilliseconds(TrackTimeMillis).ToString(@"mm\:ss");
}