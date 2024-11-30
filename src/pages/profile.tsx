import { useEffect, useState } from "react";
import peccy from "../static/images/peccy.png";
import "../static/css/ProfileCard.css";
import {
  Box, 
  Container,
  Grid, 
  Header, 
  SpaceBetween
} from "@cloudscape-design/components";
import { Rewards } from "../components/Rewards.tsx";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import BaseAppLayout from "../components/base-app-layout";
import { ProfilePageProps } from '../components/utils/profile-manager';

const client = generateClient<Schema>();

export default function ProfilePage({ user, email, attributes }: ProfilePageProps) {
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [profileInfo, setProfileInfo] = useState<Schema["Profile"]["type"]>({ 
    id: "X",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleTotalPointsUpdate = (points: number) => {
    setTotalPoints(points);
  };

  const fetchProfileInfo = async () => {
    try {
      const { data: profile } = await client.models.Profile.get({ id: user });
      if (profile) {
        setProfileInfo(prev => ({
          ...prev,
          organization: profile.organization || attributes?.['custom:organization'] || 'AWS',
          email: email
        }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    fetchProfileInfo();
  }, [user]);

  return (
    <BaseAppLayout
      content={
        <SpaceBetween size="s">
          <Container header={<Header variant="h2">My Profile</Header>}>
            <Grid gridDefinition={[{ colspan: 4 }, { colspan: 8 }]}>
              <Box padding="s">
                <img 
                  src={peccy} 
                  alt={`${user}'s avatar`}
                  width="100px" 
                  id="avatar" 
                />
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Organization: </strong> 
                    <span>{profileInfo.organization || "Not set"}</span>
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Email: </strong> 
                    <span>{email}</span>
                  </div>
                  <div>
                    <strong>Total Points: </strong> 
                    <span>{totalPoints}</span>
                  </div>
                </div>
              </Box>
            </Grid>
          </Container>
          <Rewards onPointsUpdate={handleTotalPointsUpdate} />
        </SpaceBetween>
      }  
    />
  );
}