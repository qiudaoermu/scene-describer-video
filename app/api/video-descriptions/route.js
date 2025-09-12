import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '../../../lib/mongodb';
import VideoDescription from '../../../models/VideoDescription';
import { authOptions } from '../auth/[...nextauth]/route';

// POST - Save a new video description
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { videoId, videoTitle, videoUrl, userQuery, aiDescription } = body;
    
    // Validate required fields
    if (!videoId || !videoTitle || !videoUrl || !userQuery || !aiDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create new video description record with user information
    const videoDescription = new VideoDescription({
      videoId,
      videoTitle,
      videoUrl,
      userQuery,
      aiDescription,
      userId: session.user.id,
      userEmail: session.user.email
    });
    
    await videoDescription.save();
    
    return NextResponse.json(
      { 
        message: 'Video description saved successfully',
        data: videoDescription
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error saving video description:', error);
    return NextResponse.json(
      { error: "Failed to save video description", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Retrieve video descriptions by videoId (filtered by user)
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId parameter is required' },
        { status: 400 }
      );
    }
    
    // Find all descriptions for this video by the current user, sorted by most recent first
    const descriptions = await VideoDescription.find({ 
      videoId,
      userId: session.user.id 
    })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to last 10 descriptions
    
    return NextResponse.json(
      { 
        data: descriptions,
        count: descriptions.length,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error retrieving video descriptions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve video descriptions', details: error.message },
      { status: 500 }
    );
  }
}