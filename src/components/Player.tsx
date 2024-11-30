import { useState, useCallback } from "react";
import ReactPlayer from 'react-player/lazy';
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
}

interface VideoProgress {
  playedSeconds: number;
}

export function Player({ url, user, classId, title, author, desc }: PlayerProps) {
  const [played, setPlayed] = useState(0);
  const [marker, setMarker] = useState(0);
  const [duration, setDuration] = useState(0);
  const INTERVAL = 30;

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
        <ReactPlayer
          className='react-player'
          url={url}
          width='100%'
          loop={false}
          playing={true}
          muted={true}
          controls={true}
          light={false}
          pip={false}
          onPlay={handlePlay}
          onEnded={handleEnded}
          onDuration={handleDuration}
          onProgress={handleProgress}
        />
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