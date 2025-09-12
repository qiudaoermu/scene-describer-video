import { useState } from 'react';
import { createClient } from 'pexels';

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: 'sd' | 'hd' | 'hls';
    file_type: string;
    width: number | null;
    height: number | null;
    link: string;
  }>;
  video_pictures?: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
  bestVideoFile?: {
    id: number;
    quality: 'sd' | 'hd' | 'hls';
    file_type: string;
    width: number | null;
    height: number | null;
    link: string;
  } | null;
  [key: string]: unknown;
}

export const usePexelsVideos = () => {
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Pexels client
  const client = createClient('oVaOZUHlLhFNilLPJQ1jvAPS8BFngRiKDDsEvG43ivJBXJF5VfuBqAG6');
  
  // Get best quality video file
  function getBestVideoFile(videoFiles: PexelsVideo['video_files']) {
    if (!videoFiles || videoFiles.length === 0) return null;
    // Sort by quality preference: hd, sd, then by width
    const sorted = videoFiles.sort((a, b) => {
      if (a.quality === 'hd' && b.quality !== 'hd') return -1;
      if (b.quality === 'hd' && a.quality !== 'hd') return 1;
      // Handle null width values
      const aWidth = a.width || 0;
      const bWidth = b.width || 0;
      return bWidth - aWidth;
    });
    return sorted[0];
  }
  
  // Fetch videos from Pexels
  const fetchVideos = async (query = "现实生活场景", page = 1) => {
    setLoadingVideos(true);
    setError("");
    try {
      const res = await client.videos.search({
        query,
        locale: "zh-cn",
        page,
        per_page: 12,
      });
      if ("videos" in res) {
        const formattedVideos = res.videos.map((item) => ({
          ...item,
          bestVideoFile: getBestVideoFile(item.video_files as PexelsVideo['video_files'])
        } as PexelsVideo));
        setVideos(formattedVideos);
        setCurrentPage(page);
        setTotalResults(res.total_results || 0);
        setHasNextPage(
          res.videos.length === 12 && page * 12 < (res.total_results || 0)
        );
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to fetch videos from Pexels");
    } finally {
      setLoadingVideos(false);
    }
  };
  
  // Navigation functions
  const goToNextPage = async (query = '现实生活场景') => {
    if (hasNextPage) {
      await fetchVideos(query, currentPage + 1);
    }
  };
  
  const goToPrevPage = async (query = '现实生活场景') => {
    if (currentPage > 1) {
      await fetchVideos(query, currentPage - 1);
    }
  };
  
  const resetPagination = () => {
    setCurrentPage(1);
    setTotalResults(0);
    setHasNextPage(false);
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
    resetPagination
  };
};

export type { PexelsVideo };