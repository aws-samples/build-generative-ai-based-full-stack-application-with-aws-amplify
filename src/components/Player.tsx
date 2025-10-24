import { useState, useCallback, useEffect, useRef } from "react";
import {
  Box, Container, SpaceBetween,
} from "@cloudscape-design/components";
import '../static/css/Videoplayer.css';

import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface PlayerProps {
  url: string;
  user: string;
  classId: string;
  uid: string;
  title: string;
  author: string;
  desc: string;
  subtitle?: string;
}

interface VideoProgress {
  playedSeconds: number;
}

export function Player({ url, user, classId, title, author, desc, subtitle }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [played, setPlayed] = useState(0);
  const [marker, setMarker] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitleBlobUrl, setSubtitleBlobUrl] = useState<string>('');
  const INTERVAL = 30;

  useEffect(() => {
    if (!subtitle) return;

    fetch(subtitle)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setSubtitleBlobUrl(blobUrl);
      })
      .catch(err => console.error('자막 로드 실패:', err));

    return () => {
      if (subtitleBlobUrl) URL.revokeObjectURL(subtitleBlobUrl);
    };
  }, [subtitle]);

  const updateReward = useCallback(async () => {
    try {
      const { data: existingRewards } = await client.models.Reward.list({
        filter: { userId: { eq: user }, classId: { eq: classId } }
      });

      if (existingRewards?.length > 0) {
        const existingReward = existingRewards[0];
        await client.models.Reward.update({
          id: existingReward.id,
          point: existingReward.point || 0 + 10,
          // _version: existingReward._version
        });
      } else {
        await client.models.Reward.create({
          userId: user,
          classId: classId,
          point: 10
        });
      }

      console.log('Reward updated successfully');
    } catch (error) {
      console.error('Error updating reward:', error);
    }
  }, [user, classId]);

  const handlePlay = () => {
    setMarker(played + INTERVAL);
  };

  const handleEnded = () => {
    if (Math.round(played) >= Math.floor(duration)) {
      updateReward();
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(Math.floor(duration));
  };

  const handleProgress = ({ playedSeconds }: VideoProgress) => {
    if (marker >= duration) {
      setMarker(0);
      return;
    }

    const checkpoint = marker + INTERVAL;
    setPlayed(playedSeconds);

    if (playedSeconds > checkpoint) {
      updateReward();
      setMarker(checkpoint);
    }
  };

  return (
    <Container>
      <Box>
        <video
          ref={videoRef}
          className='react-player'
          style={{ width: '100%' }}
          controls
          autoPlay
          muted

          onPlay={handlePlay}
          onEnded={handleEnded}
          onLoadedMetadata={(e) => handleDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => handleProgress({ playedSeconds: e.currentTarget.currentTime })}
        >
          <source src={url} type="video/mp4" />
          {subtitleBlobUrl && (
            <track
              kind="captions"
              src={subtitleBlobUrl}
              srcLang="en"
              label="English"
            />
          )}
        </video>
      </Box>
      <SpaceBetween direction="vertical" size="s">
        <VideoInfo title={title} author={author} description={desc} />
      </SpaceBetween>
    </Container>
  );
}

interface VideoInfoProps {
  title: string;
  author: string;
  description: string;
}

const VideoInfo = ({ title, author, description }: VideoInfoProps) => (
  <>
    <SpaceBetween direction="vertical" size="xxs">
      <Box variant="h2">{title}</Box>
      <Box variant="small">{author}</Box>
    </SpaceBetween>
    <div>{description}</div>
  </>
);