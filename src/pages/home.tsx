import { useState } from 'react';
import { 
  TextContent, 
  Box, 
  Header, 
  Container, 
  SpaceBetween, 
  Button,
  Alert,
  ProgressBar 
} from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";
import { testConnection, uploadSampleData, deleteSampleData } from "../components/utils/dataManager";

export default function HomePage() {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLink = (url: string) => {
    window.open(url, '_blank');
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    setMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
  };

  const handleUploadSampleData = async () => {
    setUploading(true);
    setMessage(null);
    
    await uploadSampleData(setProgress, setMessage);
    
    setUploading(false);
    setProgress(0);
  };

  const handleDeleteSampleData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all data?\n(Course, Class, Comment)\n\nThis action cannot be undone!'
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    
    await deleteSampleData(setProgress, setMessage);
    
    setDeleting(false);
    setProgress(0);
  };

  return (
    <BaseAppLayout
      content={
        <Container>
          <SpaceBetween size="l">
            <Header
              variant="h1"
              description="Build production-ready applications faster with AWS"
            >
              Generative AI Full-Stack Workshop
            </Header>
            
            <Container>
              <SpaceBetween size="l">
                <Box>
                  <Header variant="h2">Workshop Overview</Header>
                  <TextContent>
                    <p>
                      Learn to rapidly build a full-stack Generative AI application using AWS Bedrock 
                      and pre-built UI components. This workshop demonstrates how to overcome the challenges of 
                      full-stack development by leveraging modern tools and services.
                    </p>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">What You'll Learn</Header>
                  <TextContent>
                    <ul>
                      <li>Building with Cloudscape Design System</li>
                      <li>Integrating AWS Amplify</li>
                      <li>Implementing AWS Bedrock</li>
                      <li>Creating a Digital Training Platform</li>
                    </ul>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">Key Benefits</Header>
                  <TextContent>
                    <ul>
                      <li>Streamlined development process</li>
                      <li>Production-ready components</li>
                      <li>Efficient full-stack integration</li>
                      <li>Scalable serverless architecture</li>
                    </ul>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">Technical Stack</Header>
                  <SpaceBetween direction="horizontal" size="s">
                    <Button
                      onClick={() => handleLink('https://react.dev')}
                      variant="normal"
                      iconName="external"
                    >
                      React
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/amplify')}
                      variant="normal"
                      iconName="external"
                    >
                      AWS Amplify
                    </Button>
                    <Button
                      onClick={() => handleLink('https://cloudscape.design')}
                      variant="normal"
                      iconName="external"
                    >
                      Cloudscape
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/bedrock')}
                      variant="normal"
                      iconName="external"
                    >
                      AWS Bedrock
                    </Button>
                  </SpaceBetween>
                </Box>

                <Box>
                  <Header variant="h3">Get Started</Header>
                  <TextContent>
                    <p>Ready to begin your journey with AWS Bedrock and full-stack development? Let's dive in!</p>
                  </TextContent>
                </Box>
              </SpaceBetween>
            </Container>

            <Container>
              <SpaceBetween size="m">
                <Header variant="h2">Sample Data Management</Header>

                {message && (
                  <Alert
                    type={message.type}
                    dismissible
                    onDismiss={() => setMessage(null)}
                  >
                    {message.text}
                  </Alert>
                )}

                {(uploading || deleting) && (
                  <ProgressBar
                    value={progress}
                    label={uploading ? "Uploading..." : "Deleting..."}
                    description={`${Math.round(progress)}% complete`}
                  />
                )}

                <SpaceBetween direction="horizontal" size="s">
                  <Button
                    variant="primary"
                    onClick={handleUploadSampleData}
                    disabled={uploading || deleting}
                    iconName="upload"
                  >
                    {uploading ? "Uploading..." : "Upload Sample Data"}
                  </Button>

                  <Button
                    variant="normal"
                    onClick={handleDeleteSampleData}
                    disabled={uploading || deleting}
                    iconName="remove"
                  >
                    {deleting ? "Deleting..." : "Delete All Data"}
                  </Button>

                  <Button
                    variant="link"
                    onClick={handleTestConnection}
                    disabled={uploading || deleting}
                    iconName="status-positive"
                  >
                    Test Connection
                  </Button>
                </SpaceBetween>

                <Alert type="info">
                  <strong>Tip:</strong> Upload sample data to get started with the workshop. 
                  You can clean up the data using the delete button when no longer needed.
                  <br />
                  <small>Data source: script/init/*.json</small>
                </Alert>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Container>
      }
    />
  );
}
