import { useEffect, useState } from "react";
import peccy from "../static/images/peccy.png";
import {
  Box, 
  Container,
  Grid, 
  Header, 
  SpaceBetween,
  ColumnLayout,
  Badge,
  Cards
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

  const profileCards = [
    {
      title: "Personal Information",
      content: (
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Username</Box>
            <div>{user}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Email</Box>
            <div>{email}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Organization</Box>
            <div>{profileInfo.organization || "Not set"}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Learning Points</Box>
            <Badge color="green">{totalPoints} points</Badge>
          </div>
        </ColumnLayout>
      )
    }
  ];

  return (
    <BaseAppLayout
      content={
        <SpaceBetween size="l">
          <Container header={<Header variant="h1">My Profile</Header>}>
            <Grid gridDefinition={[{ colspan: 3 }, { colspan: 9 }]}>
              <Box textAlign="center" padding="l">
                <img 
                  src={peccy} 
                  alt={`${user}'s avatar`}
                  style={{
                    width: "120px",
                    height: "120px", 
                    borderRadius: "8px",
                    objectFit: "cover",
                    border: "2px solid #e9ebed"
                  }}
                />
              </Box>
              
              <Cards
                cardDefinition={{
                  header: item => item.title,
                  sections: [
                    {
                      id: "content",
                      content: item => item.content
                    }
                  ]
                }}
                items={profileCards}
                cardsPerRow={[{ cards: 1 }]}
              />
            </Grid>
          </Container>
          
          <Rewards onPointsUpdate={handleTotalPointsUpdate} />
        </SpaceBetween>
      }  
    />
  );
}
