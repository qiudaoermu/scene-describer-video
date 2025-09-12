import { useState } from 'react';
import { createClient } from 'pexels';

interface PexelsPhoto {
  id: number;
  url: string;
  src: string;
  photographer: string;
  alt: string;
  [key: string]: unknown;
}

export const usePexelsPhotos = () => {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Pexels client
  const client = createClient('oVaOZUHlLhFNilLPJQ1jvAPS8BFngRiKDDsEvG43ivJBXJF5VfuBqAG6');
  
  // Format Pexels URL helper function
  function formatPexelsUrl(url: string): string {
    const numberMatch = url.match(/\/(\d+)\/?$/);
    if (!numberMatch) {
      return '';
    }
    const number = numberMatch[1];
    return `https://images.pexels.com/photos/${number}/pexels-photo-${number}.jpeg`;
  }
  
  // Fetch photos from Pexels
  const fetchPhotos = async (query = "现实生活场景",  page = 1) => {
    setLoadingPhotos(true);
    setError("");
    try {
      const res = await client.photos.search({
        query,
        locale: "zh-cn",
        page,
        per_page: 16,
      });
      if ("photos" in res) {
        const formattedPhotos = res.photos.map(
          (item) =>
            ({
              ...item,
              src: formatPexelsUrl(item.url),
            } as PexelsPhoto)
        );
        setPhotos(formattedPhotos);
        setCurrentPage(page);
        setTotalResults(res.total_results || 0);
        setHasNextPage(
          res.photos.length === 16 && page * 16 < (res.total_results || 0)
        );
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
      setError("Failed to fetch photos from Pexels");
    } finally {
      setLoadingPhotos(false);
    }
  };
  
  // Navigation functions
  const goToNextPage = async (query = '现实生活场景') => {
    if (hasNextPage) {
      await fetchPhotos(query, currentPage + 1);
    }
  };
  
  const goToPrevPage = async (query = '现实生活场景') => {
    if (currentPage > 1) {
      await fetchPhotos(query, currentPage - 1);
    }
  };
  
  const resetPagination = () => {
    setCurrentPage(1);
    setTotalResults(0);
    setHasNextPage(false);
  };

  return {
    photos,
    loadingPhotos,
    error,
    currentPage,
    totalResults,
    hasNextPage,
    fetchPhotos,
    goToNextPage,
    goToPrevPage,
    resetPagination
  };
};

export type { PexelsPhoto };