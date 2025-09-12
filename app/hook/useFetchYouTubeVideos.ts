import { useState } from 'react';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
}

export const useYouTubeVideos = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string>('');

  // YouTube API配置
  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const BASE_URL = 'https://www.googleapis.com/youtube/v3';

  // 获取YouTube短视频
  const fetchVideos = async (query = "短视频", pageToken = '') => {
    if (!API_KEY) {
      setError('YouTube API密钥未配置');
      return;
    }

    setLoadingVideos(true);
    setError("");
    
    try {
      // 搜索短视频（时长小于4分钟）
      const searchUrl = `${BASE_URL}/search?part=snippet&chart=mostPopular&type=video&videoDuration=short&maxResults=12&q=${encodeURIComponent(
        query
      )}&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (searchData.error) {
        throw new Error(searchData.error.message);
      }

      const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');
      
      // 获取视频详细信息
      const detailsUrl = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(detailsData.error.message);
      }

      const formattedVideos: YouTubeVideo[] = detailsData.items.map((item: {
        id: string;
        snippet: {
          title: string;
          description: string;
          thumbnails: {
            medium?: { url: string };
            default: { url: string };
          };
          channelTitle: string;
          publishedAt: string;
        };
        contentDetails: {
          duration: string;
        };
        statistics: {
          viewCount?: string;
        };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        viewCount: item.statistics.viewCount || '0',
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));

      setVideos(formattedVideos);
      setTotalResults(searchData.pageInfo.totalResults || 0);
      setHasNextPage(!!searchData.nextPageToken);
      setNextPageToken(searchData.nextPageToken || '');
      
    } catch (error) {
      console.error("Error fetching YouTube videos:", error);
      setError("获取YouTube视频失败，请检查网络连接或API配置");
    } finally {
      setLoadingVideos(false);
    }
  };

  // 导航函数
  const goToNextPage = async (query = '短视频') => {
    if (hasNextPage && nextPageToken) {
      await fetchVideos(query, nextPageToken);
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = async (query = '短视频') => {
    // YouTube API不支持直接的上一页，这里重新搜索第一页
    if (currentPage > 1) {
      await fetchVideos(query, '');
      setCurrentPage(1);
    }
  };

  const resetPagination = () => {
    setCurrentPage(1);
    setTotalResults(0);
    setHasNextPage(false);
    setNextPageToken('');
  };

  // 解析YouTube时长格式 (PT1M30S -> 1:30)
  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    videos,
    loadingVideos,
    error,
    currentPage,
    totalResults,
    hasNextPage,
    fetchVideos,
    goToNextPage,
    goToPrevPage,
    resetPagination,
    formatDuration
  };
};

export type { YouTubeVideo };