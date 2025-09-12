"use client";

import { useState, useRef, useEffect } from "react";
import { aiCreateText } from "./text-test.js";
import { aiUnderStandVideo } from "./video-understanding.js";
import { aiDescribeImage } from "./image-understanding.js";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { usePexelsPhotos, PexelsPhoto } from "./hook/usePexelsPhotos.ts";
import {
  useYouTubeVideos,
  YouTubeVideo,
} from "./hook/useFetchYouTubeVideos.js";

export default function Home() {
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [error, setError] = useState("");
  const [sceneUrl, setSceneUrl] = useState("https://picsum.photos/400/300");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("image"); // "text", "image" 或 "video"
  const [videoSummary, setVideoSummary] = useState("");
  const [imageSummary, setImageSummary] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [videoHistory, setVideoHistory] = useState<
    {
      _id: string;
      videoId: string;
      videoTitle: string;
      videoUrl: string;
      userQuery: string;
      aiDescription: string;
      createdAt: string;
    }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // Use Pexels photos hook
  const {
    photos,
    loadingPhotos,
    error: pexelsError,
    currentPage,
    totalResults,
    hasNextPage,
    fetchPhotos,
    goToNextPage,
    goToPrevPage,
  } = usePexelsPhotos();

  // Use YouTube videos hook
  const {
    videos,
    loadingVideos,
    error: youtubeVideoError,
    currentPage: videoCurrentPage,
    totalResults: videoTotalResults,
    hasNextPage: videoHasNextPage,
    fetchVideos,
    goToNextPage: goToNextVideoPage,
    goToPrevPage: goToPrevVideoPage,
    formatDuration,
  } = useYouTubeVideos();

  // Fetch photos/videos on component mount
  useEffect(() => {
    if (mode === "image") {
      fetchPhotos();
    } else if (mode === "video") {
      fetchVideos("短视频");
    }
  }, [mode]);

  useEffect(() => {
    const fetchImage = async () => {
      if (sceneUrl) {
        const response = await fetch(sceneUrl);
        // Convert response to blob URL or handle as needed
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImageFile(imageUrl);
      }
    };
    fetchImage();
  }, [sceneUrl]);

  // const getUnsplash = async () => {
  //   const response = await fetch(
  //     "https://api.unsplash.com/photos/random?client_id=gVRrKBlzD7YHBHctTDVNrKbjArKF8yaUc0cnJnrTNaQ"
  //   );
  //   debugger
  //   // Convert response to blob URL or handle as needed
  //   const blob = await response.blob();
  //   const imageUrl = URL.createObjectURL(blob);
  //   setImageFile(imageUrl);
  // };
  // getUnsplash()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 创建本地预览URL用于显示
      const previewUrl = URL.createObjectURL(file);
      setSceneUrl(previewUrl);
    }
  };

  const handleModeChange = (newMode: string) => {
    setImageSummary("");
    setVideoSummary("");
    setMode(newMode);
    setError("");
  };

  const fetchVideoHistory = async (videoId: string) => {
    try {
      const response = await fetch(
        `/api/video-descriptions?videoId=${videoId}`
      );
      if (response.ok) {
        const data = await response.json();
        setVideoHistory(data.data || []);
      } else {
        setVideoHistory([]);
      }
    } catch (error) {
      console.error("Error fetching video history:", error);
      setVideoHistory([]);
    }
  };

  const handleVideoSelect = async (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setShowHistory(true);
    await fetchVideoHistory(video.id);
  };

  const handleAiUnderStandVideo = async () => {
    setLoading(true);
    setError("");

    try {
      // Use selected YouTube video URL if available, otherwise use default
      const videoUrl = selectedVideo
        ? `https://www.youtube.com/watch?v=${selectedVideo.id}`
        : null;
      console.log("Analyzing YouTube video:", videoUrl || "default video");

      const result = await aiUnderStandVideo(videoUrl, userText);
      setVideoSummary(result);

      // Save to database if we have a selected video and user query
      if (selectedVideo && userText.trim() && result) {
        try {
          await fetch("/api/video-descriptions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              videoId: selectedVideo.id,
              videoTitle: selectedVideo.title,
              videoUrl: videoUrl,
              userQuery: userText.trim(),
              aiDescription: result,
            }),
          });
          console.log("Video description saved to database");
        } catch (dbError) {
          console.error("Error saving to database:", dbError);
          // Don't show error to user for database issues
        }
      }
    } catch (error) {
      console.error("Error analyzing video:", error);
      setError("视频分析失败，请重试。");
    } finally {
      setLoading(false);
    }
  };
  const handleAiDescribeImage = async () => {
    if (!userText.trim()) {
      setError("Please enter a description or question about the image");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await aiDescribeImage(imageFile, userText);
      setImageSummary(result);
    } catch (error) {
      console.error("Error describing image:", error);
      setError("Failed to describe image. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (mode === "text" && !userText.trim()) {
      setError("请输入文本");
      return;
    }

    if (mode === "image" && !userText.trim()) {
      setError("请输入对图片的描述");
      return;
    }

    if (mode === "video" && !userText.trim()) {
      setError("请输入对视频的问题或描述需求");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/describe", {
        userText, // 描述内容
        imageUrl: mode === "image" ? sceneUrl : "", // 使用sceneUrl
        mode,
      });
      setAiText(res.data.item);
    } catch (err: Error | unknown) {
      console.error(err);
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || "请求失败，请稍后再试");
      setAiText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px",
        paddingBottom: "0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1
          style={{
            color: "#333",
            fontSize: "2.5rem",
            marginBottom: "10px",
            fontWeight: "300",
          }}
        >
          Scene Describer
        </h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          AI-powered content analysis and generation
        </p>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "30px",
        }}
      >
        <button
          onClick={() => handleModeChange("image")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "500",
            border: "2px solid #4CAF50",
            borderRadius: "8px",
            backgroundColor: mode === "image" ? "#4CAF50" : "transparent",
            color: mode === "image" ? "white" : "#4CAF50",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          🖼️ 图像模式
        </button>
        <button
          onClick={() => handleModeChange("video")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "500",
            border: "2px solid #4CAF50",
            borderRadius: "8px",
            backgroundColor: mode === "video" ? "#4CAF50" : "transparent",
            color: mode === "video" ? "white" : "#4CAF50",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          🎥 视频模式
        </button>
        {/* <button
          onClick={() => handleModeChange("text")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "500",
            border: "2px solid #4CAF50",
            borderRadius: "8px",
            backgroundColor: mode === "text" ? "#4CAF50" : "transparent",
            color: mode === "text" ? "white" : "#4CAF50",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          📝 文本模式
        </button> */}
      </div>
      {mode === "image" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "30px",
            padding: "20px",
            border: "2px dashed #ddd",
            borderRadius: "12px",
            backgroundColor: "#fafafa",
          }}
        >
          {imageFile && (
            <img
              src={imageFile}
              alt="scene"
              style={{
                maxWidth: "100%",
                height: "600px",
                objectFit: "cover",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                marginBottom: "15px",
              }}
            />
          )}
          {/* <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
            style={{ display: "none" }}
          /> */}
          <div style={{ marginTop: "20px", width: "100%" }}>
            <h4
              style={{
                textAlign: "center",
                marginBottom: "15px",
                color: "#333",
              }}
            >
              📸 选择图片 {loadingPhotos && "(加载中...)"}
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "10px",
                maxHeight: "300px",
                overflowY: "auto",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: "white",
              }}
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    setSceneUrl(photo.src);
                    setImageFile(photo.src);
                  }}
                  style={{
                    cursor: "pointer",
                    borderRadius: "6px",
                    overflow: "hidden",
                    border:
                      sceneUrl === photo.src
                        ? "3px solid #4CAF50"
                        : "2px solid transparent",
                    transition: "all 0.3s ease",
                  }}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt || "Pexels photo"}
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "15px",
                marginTop: "15px",
                padding: "10px",
              }}
            >
              <button
                onClick={() => goToPrevPage()}
                disabled={currentPage <= 1 || loadingPhotos}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "2px solid #4CAF50",
                  borderRadius: "6px",
                  backgroundColor:
                    currentPage <= 1 || loadingPhotos
                      ? "#f5f5f5"
                      : "transparent",
                  color: currentPage <= 1 || loadingPhotos ? "#999" : "#4CAF50",
                  cursor:
                    currentPage <= 1 || loadingPhotos
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                ←
              </button>

              <span
                style={{
                  fontSize: "14px",
                  color: "#666",
                  minWidth: "120px",
                  textAlign: "center",
                }}
              >
                第 {currentPage} 页 ({totalResults} 张图片)
              </span>

              <button
                onClick={() => goToNextPage()}
                disabled={!hasNextPage || loadingPhotos}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "2px solid #4CAF50",
                  borderRadius: "6px",
                  backgroundColor:
                    !hasNextPage || loadingPhotos ? "#f5f5f5" : "transparent",
                  color: !hasNextPage || loadingPhotos ? "#999" : "#4CAF50",
                  cursor:
                    !hasNextPage || loadingPhotos ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "video" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "30px",
            padding: "20px 20px 0 20px",
            border: "2px dashed #ddd",
            borderRadius: "12px",
            backgroundColor: "#fafafa",
          }}
        >
          {selectedVideo ? (
            <div
              style={{
                border: "2px solid #ddd",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                marginBottom: "15px",
              }}
            >
              <iframe
                key={selectedVideo.id}
                width="291"
                height="520"
                src={`https://www.youtube.com/embed/${selectedVideo.id}`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ border: "none", display: "block" }}
              ></iframe>
            </div>
          ) : (
            <div
              style={{
                border: "2px solid #ddd",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                marginBottom: "5px",
              }}
            >
              <iframe
                width="291"
                height="400"
                src={process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_URL}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ border: "none", display: "block" }}
              ></iframe>
            </div>
          )}

          <div
            style={{
              textAlign: "center",
              margin: "10px 0 0 0",
            }}
          >
            {/* <p
              style={{
                color: "#666",
                fontSize: "14px",
                margin: "0 0 5px 0",
              }}
            >
              {selectedVideo
                ? `📺 已选择: ${selectedVideo.title}`
                : "📺 请选择一个YouTube短视频或使用默认演示视频"}
            </p> */}
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: "30px",
          position: "relative",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          transition: "all 0.3s ease",
          overflow: "hidden",
        }}
      >
        <textarea
          rows={1}
          placeholder={
            mode === "text"
              ? "输入要处理的文本..."
              : mode === "image"
              ? "请输入对图片的描述..."
              : "请输入对视频的问题或描述需求..."
          }
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          style={{
            width: "100%",
            padding: "16px 16px 60px 16px",
            fontSize: "16px",
            border: "none",
            borderRadius: "16px",
            resize: "none",
            fontFamily: "inherit",
            outline: "none",
            background: "transparent",
            minHeight: "100px",
            maxHeight: "200px",
            lineHeight: "1.5",
            color: "#374151",
          }}
          onFocus={(e) => {
            if (e.target.parentElement) {
              e.target.parentElement.style.borderColor = "#3b82f6";
              e.target.parentElement.style.boxShadow =
                "0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)";
            }
          }}
          onBlur={(e) => {
            if (e.target.parentElement) {
              e.target.parentElement.style.borderColor = "#e5e7eb";
              e.target.parentElement.style.boxShadow =
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {mode === "text" && (
            <button
              onClick={aiCreateText}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#f9fafb";
                target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#ffffff";
                target.style.borderColor = "#d1d5db";
              }}
            >
              ✨ 生成文本
            </button>
          )}

          {mode === "image" && (
            <button
              onClick={handleAiDescribeImage}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#f9fafb";
                target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#ffffff";
                target.style.borderColor = "#d1d5db";
              }}
            >
              🖼️ 描述图片
            </button>
          )}

          <button
            onClick={mode === "video" ? handleAiUnderStandVideo : handleSubmit}
            disabled={loading}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: "500",
              border: loading ? "1px solid #d1d5db" : "1px solid #3b82f6",
              borderRadius: "8px",
              backgroundColor: loading ? "#f3f4f6" : "#3b82f6",
              color: loading ? "#9ca3af" : "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: loading ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#2563eb";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = "#3b82f6";
              }
            }}
          >
            {loading
              ? "⏳ 处理中..."
              : mode === "video"
              ? "🎥 分析视频"
              : "🚀 提交"}
          </button>
        </div>
      </div>
      {(error || pexelsError || youtubeVideoError) && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "8px",
            color: "#c62828",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <p style={{ margin: 0, fontWeight: "500" }}>
              {error || pexelsError || youtubeVideoError}
            </p>
          </div>
        </div>
      )}

      {aiText && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            border: "2px solid #e9ecef",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              margin: "0 0 15px 0",
              color: "#333",
              fontSize: "1.3rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🤖 AI 分析结果
          </h3>
          <p
            style={{
              margin: 0,
              lineHeight: "1.6",
              color: "#555",
              fontSize: "16px",
            }}
          >
            {aiText}
          </p>
        </div>
      )}

      {videoSummary && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            border: "2px solid #ffb74d",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              margin: "0 0 15px 0",
              color: "#333",
              fontSize: "1.3rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🎬 视频分析
          </h3>
          <div
            style={{
              margin: 0,
              lineHeight: "1.6",
              color: "#555",
              fontSize: "20px",
            }}
          >
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <strong
                    style={{
                      fontWeight: "700",
                    }}
                    className="markdown-strong"
                  >
                    {children}
                  </strong>
                ),
                hr: () => (
                  <hr
                    style={{
                      marginTop: "1.2em",
                    }}
                  />
                ),
                h2: ({ children }) => (
                  <h2
                    style={{
                      fontWeight: "700",
                      color: "#000",
                      backgroundColor: "rgba(33, 150, 243, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "1.55em",
                      marginBottom: "1em",
                    }}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3
                    style={{
                      fontWeight: "700",
                      color: "#000",
                      backgroundColor: "rgba(33, 150, 243, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "1.55em",
                      marginBottom: "0.3em",
                    }}
                  >
                    {children}
                  </h3>
                ),
              }}
            >
              {videoSummary}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {imageSummary && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#fff3e0",
            border: "2px solid #ffb74d",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              margin: "0 0 15px 0",
              color: "#333",
              fontSize: "1.3rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🎬 图片分析
          </h3>
          <p
            style={{
              margin: 0,
              lineHeight: "1.6",
              color: "#555",
              fontSize: "16px",
            }}
          >
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <strong
                    style={{
                      fontWeight: "700",
                    }}
                    className="markdown-strong"
                  >
                    {children}
                  </strong>
                ),
                b: ({ children }) => (
                  <b
                    style={{
                      fontWeight: "700",
                      color: "#2196F3",
                      backgroundColor: "rgba(33, 150, 243, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "1.05em",
                    }}
                  >
                    {children}
                  </b>
                ),
              }}
            >
              {imageSummary}
            </ReactMarkdown>
          </p>
        </div>
      )}
      {mode === "video" && (
        <div style={{ marginTop: "20px", width: "100%" }}>
          <h4
            style={{
              textAlign: "center",
              marginBottom: "15px",
              color: "#333",
            }}
          >
            📺 选择YouTube短视频 {loadingVideos && "(加载中...)"}
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "10px",
              maxHeight: "400px",
              overflowY: "auto",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "white",
            }}
          >
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => handleVideoSelect(video)}
                style={{
                  cursor: "pointer",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border:
                    selectedVideo?.id === video.id
                      ? "3px solid #4CAF50"
                      : "2px solid transparent",
                  transition: "all 0.3s ease",
                  position: "relative",
                }}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "5px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  {formatDuration(video.duration)}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                    color: "white",
                    padding: "20px 5px 5px 5px",
                    fontSize: "10px",
                    lineHeight: "1.2",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                    {video.title.length > 30
                      ? video.title.substring(0, 30) + "..."
                      : video.title}
                  </div>
                  <div style={{ opacity: 0.8 }}>{video.channelTitle}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Video Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "15px",
              marginTop: "15px",
              padding: "10px",
            }}
          >
            <button
              onClick={() => goToPrevVideoPage()}
              disabled={videoCurrentPage <= 1 || loadingVideos}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                border: "2px solid #4CAF50",
                borderRadius: "6px",
                backgroundColor:
                  videoCurrentPage <= 1 || loadingVideos
                    ? "#f5f5f5"
                    : "transparent",
                color:
                  videoCurrentPage <= 1 || loadingVideos ? "#999" : "#4CAF50",
                cursor:
                  videoCurrentPage <= 1 || loadingVideos
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.3s ease",
              }}
            >
              ←
            </button>

            <span
              style={{
                fontSize: "14px",
                color: "#666",
                minWidth: "120px",
                textAlign: "center",
              }}
            >
              Page: {videoCurrentPage} ({videoTotalResults} )
            </span>

            <button
              onClick={() => goToNextVideoPage()}
              disabled={!videoHasNextPage || loadingVideos}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                border: "2px solid #4CAF50",
                borderRadius: "6px",
                backgroundColor:
                  !videoHasNextPage || loadingVideos
                    ? "#f5f5f5"
                    : "transparent",
                color: !videoHasNextPage || loadingVideos ? "#999" : "#4CAF50",
                cursor:
                  !videoHasNextPage || loadingVideos
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.3s ease",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Video History Modal */}
      {videoHistory.length && showHistory && selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowHistory(false);
            setVideoHistory([]);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              maxWidth: "800px",
              maxHeight: "80vh",
              overflowY: "auto",
              margin: "20px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#333" }}>
                📺 {selectedVideo.title} - 历史记录
              </h3>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setVideoHistory([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            {videoHistory.length === 0 ? (
              <p
                style={{ textAlign: "center", color: "#666", padding: "40px" }}
              >
                暂无历史记录
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {videoHistory.map((record) => (
                  <div
                    key={record._id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "15px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <strong style={{ color: "#374151" }}>问题:</strong>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {new Date(record.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 10px 0", color: "#4b5563" }}>
                      {record.userQuery}
                    </p>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#374151" }}>AI回答:</strong>
                    </div>
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        color: "#374151",
                      }}
                    >
                      <ReactMarkdown
                        components={{
                          strong: ({ children }) => (
                            <strong className="markdown-strong">
                              {children}
                            </strong>
                          ),
                        }}
                      >
                        {record.aiDescription}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
