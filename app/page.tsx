"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { aiCreateText } from "./text-test.js"
import { aiUnderStandVideo } from "./video-understanding.js"
import { aiDescribeImage } from "./image-understanding.js"
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { usePexelsPhotos, PexelsPhoto } from "./hook/usePexelsPhotos";
import {
  useYouTubeVideos,
  YouTubeVideo,
} from "./hook/useFetchYouTubeVideos";

export default function Home() {
  const { data: session, status } = useSession();
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [error, setError] = useState("");
  const [sceneUrl, setSceneUrl] = useState("https://picsum.photos/400/300");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("video"); // "text", "image" 或 "video"
  const [videoSummary, setVideoSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoResultRef = useRef<HTMLDivElement>(null);
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

 
console.log(session, "session");
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
    setIsStreaming(true);
    setVideoSummary(""); // 清空之前的内容

    try {
      // Use selected YouTube video URL if available, otherwise use default
      const videoUrl = selectedVideo
        ? `https://www.youtube.com/watch?v=${selectedVideo.id}`
        : null;
      console.log("Analyzing YouTube video:", videoUrl || "default video");

      // 流式显示回调函数 - 使用防抖减少频繁更新
      const handleStreamChunk = (chunkText: string, fullText: string) => {
        // 清除之前的定时器
        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
        }
        
        // 立即更新（保持流式效果）
        setVideoSummary(fullText);
        
        // 自动滚动到底部
        setTimeout(() => {
          if (videoResultRef.current) {
            videoResultRef.current.scrollTop = videoResultRef.current.scrollHeight;
          }
        }, 10);
        
        // 设置防抖定时器，确保最终内容正确
        streamingTimeoutRef.current = setTimeout(() => {
          setVideoSummary(fullText);
          // 确保最终滚动到底部
          if (videoResultRef.current) {
            videoResultRef.current.scrollTop = videoResultRef.current.scrollHeight;
          }
        }, 50); // 50ms 防抖
      };

      const result = await aiUnderStandVideo(videoUrl, userText, handleStreamChunk);
      
      // 确保最终内容已设置
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
      setIsStreaming(false);
      
      // 清理定时器
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
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
        margin: "0 auto",
        padding: "20px",
        paddingBottom: "0",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#0f0f23",
        minHeight: "100vh",
        color: "#e5e7eb",
      }}
    >
      {/* 用户登录状态栏 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          padding: "15px 20px",
          backgroundColor: "#1f2937",
          borderRadius: "12px",
          border: "1px solid #374151",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e5e7eb" }}>
            🎬 视频场景描述器
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {status === "loading" ? (
            <span style={{ color: "#9ca3af" }}>加载中...</span>
          ) : session ? (
            <>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt="用户头像"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "2px solid #4b5563",
                    }}
                  />
                )}
                <span style={{ color: "#e5e7eb", fontSize: "14px" }}>
                  欢迎，{session.user?.name || session.user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "1px solid #dc2626",
                  borderRadius: "8px",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = "#dc2626";
                }}
              >
                登出
              </button>
            </>
          ) : (
            <div>
              <button
                onClick={() => signIn()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "1px solid #3b82f6",
                  borderRadius: "8px",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = "#3b82f6";
                }}
              >
                🔐 登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 未登录提示 */}
      {!session && (
        <div
          style={{
            marginBottom: "20px",
            padding: "20px",
            backgroundColor: "#1f2937",
            border: "2px solid #f59e0b",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#f59e0b" }}>
            🔐 请先登录
          </h3>
          <p style={{ margin: 0, color: "#d1d5db" }}>
            请使用Google账号登录以保存和查看您的视频分析记录
          </p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "10px",
          padding: "0px 0px 0px 0px",
          borderRadius: "12px",
          backgroundColor: "#1f2937",
          opacity: session ? 1 : 0.5,
          pointerEvents: session ? "auto" : "none",
        }}
      >
        {selectedVideo ? (
          <div
            style={{
              border: "2px solid #374151",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
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
              border: "2px solid #374151",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            <iframe
              width="291"
              height="520"
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
            flex: 1,
            marginLeft: "10px",
            height: "520px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* 视频分析结果区域 */}
          {
            <div
              ref={videoResultRef}
              style={{
                height: "350px",
                borderRadius: "4px",
                overflowY: "auto",
                padding: "10px",
                backgroundColor: "#374151",
                scrollBehavior: "smooth",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  color: "#e5e7eb",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🎬 视频分析{" "}
                {isStreaming && (
                  <span style={{ color: "#3b82f6", fontSize: "0.8rem" }}>
                    ⚡ 实时生成中...
                  </span>
                )}
              </h4>
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#d1d5db",
                }}
              >
                <div key={`markdown-${videoSummary.length}`}>
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
                            color: "#e5e7eb",
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "1.2em",
                            marginBottom: "0.8em",
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontWeight: "700",
                            color: "#e5e7eb",
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "1.1em",
                            marginBottom: "0.5em",
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
                {isStreaming && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "2px",
                      height: "16px",
                      backgroundColor: "#3b82f6",
                      marginLeft: "2px",
                      animation: "blink 1s infinite",
                    }}
                  />
                )}
              </div>
            </div>
          }
          {/* 输入框区域 */}
          <div
            style={{
              height: "160px",
              position: "relative",
              background: "#374151",
              borderRadius: "4px",
              border: "1px solid #4b5563",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
              transition: "all 0.3s ease",
              overflow: "hidden",
            }}
          >
            <textarea
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
                borderRadius: "2px",
                resize: "none",
                fontFamily: "inherit",
                outline: "none",
                background: "transparent",
                height: "100%",
                lineHeight: "1.5",
                color: "#e5e7eb",
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
                    border: "1px solid #6b7280",
                    borderRadius: "8px",
                    backgroundColor: "#4b5563",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#6b7280";
                    target.style.borderColor = "#9ca3af";
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#4b5563";
                    target.style.borderColor = "#6b7280";
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
                    border: "1px solid #6b7280",
                    borderRadius: "8px",
                    backgroundColor: "#4b5563",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#6b7280";
                    target.style.borderColor = "#9ca3af";
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#4b5563";
                    target.style.borderColor = "#6b7280";
                  }}
                >
                  🖼️ 描述图片
                </button>
              )}

              <button
                onClick={
                  mode === "video" ? handleAiUnderStandVideo : handleSubmit
                }
                disabled={loading}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: "500",
                  border: loading ? "1px solid #4b5563" : "1px solid #3b82f6",
                  borderRadius: "8px",
                  backgroundColor: loading ? "#374151" : "#3b82f6",
                  color: loading ? "#6b7280" : "#ffffff",
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
        </div>
        <div
          style={{
            textAlign: "center",
            margin: "10px 0 0 0",
          }}
        ></div>
      </div>

      {(error || pexelsError || youtubeVideoError) && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "8px",
            color: "#fca5a5",
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
            marginTop: "10px",
            padding: "20px",
            backgroundColor: "#374151",
            border: "2px solid #4b5563",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          <h3
            style={{
              margin: "0 0 15px 0",
              color: "#e5e7eb",
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
              color: "#d1d5db",
              fontSize: "16px",
            }}
          >
            {aiText}
          </p>
        </div>
      )}

      <div style={{ marginTop: "10px", width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "10px",
            border: "1px solid #4b5563",
            borderRadius: "8px",
            backgroundColor: "#374151",
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
              border: "2px solid #10b981",
              borderRadius: "6px",
              backgroundColor:
                videoCurrentPage <= 1 || loadingVideos
                  ? "#374151"
                  : "transparent",
              color:
                videoCurrentPage <= 1 || loadingVideos ? "#6b7280" : "#10b981",
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
              color: "#9ca3af",
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
              border: "2px solid #10b981",
              borderRadius: "6px",
              backgroundColor:
                !videoHasNextPage || loadingVideos ? "#374151" : "transparent",
              color: !videoHasNextPage || loadingVideos ? "#6b7280" : "#10b981",
              cursor:
                !videoHasNextPage || loadingVideos ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Video History Modal */}
      {videoHistory.length > 0 && selectedVideo && (
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
              backgroundColor: "#374151",
              borderRadius: "12px",
              padding: "10px",
              paddingTop: "0",
              maxWidth: "1300px",
              maxHeight: "80vh",
              margin: "20px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                position: "sticky",
                top: 0,
                backgroundColor: "#374151",
                zIndex: 10,
                padding: "15px 10px",
                borderBottom: "1px solid #4b5563",
              }}
            >
              <h3 style={{ margin: 0, color: "#e5e7eb" }}>
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
                  color: "#9ca3af",
                }}
              >
                ×
              </button>
            </div>

            {videoHistory.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  padding: "40px",
                }}
              >
                暂无历史记录
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  overflowX: "auto",
                  maxWidth: "1200px",
                  maxHeight: "60vh",
                }}
              >
                {videoHistory.map((record) => (
                  <div
                    key={record._id}
                    style={{
                      border: "1px solid #4b5563",
                      borderRadius: "8px",
                      padding: "15px",
                      overflowY: "auto",

                      backgroundColor: "#4b5563",
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
                      <strong style={{ color: "#e5e7eb" }}>问题:</strong>
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {new Date(record.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 10px 0", color: "#d1d5db" }}>
                      {record.userQuery}
                    </p>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#e5e7eb" }}>AI回答:</strong>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#374151",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #6b7280",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        color: "#d1d5db",
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
