// import { useEffect, useState } from 'react'
import { TextContent, Box, Header, Container, SpaceBetween, Button } from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";

export default function HomePage() {
  const handleLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <BaseAppLayout
      content={
        <Container>
          <SpaceBetween size="l">
            <Box margin={{ top: 'l' }}>
              <Header
                variant="h1"
                description="🚀 Build production-ready applications faster with AWS"
              >
                ⚡ Generative AI Full-Stack Workshop
              </Header>
            </Box>
            
            <Box padding="l" variant="div">
              <TextContent>
                <h2>🎯 Workshop Overview</h2>
                <p>
                  Learn to rapidly build a full-stack Generative AI application using AWS Bedrock 
                  and pre-built UI components. This workshop demonstrates how to overcome the challenges of 
                  full-stack development by leveraging modern tools and services.
                </p>

                <h3>📚 What You'll Learn</h3>
                <ul>
                  <li>🎨 Building with Cloudscape Design System</li>
                  <li>⚡ Integrating AWS Amplify</li>
                  <li>🤖 Implementing AWS Bedrock</li>
                  <li>🏛️ Creating a Digital Training Platform</li>
                </ul>

                <h3>✨ Key Benefits</h3>
                <ul>
                  <li>⚡ Streamlined development process</li>
                  <li>🔥 Production-ready components</li>
                  <li>🔄 Efficient full-stack integration</li>
                  <li>📈 Scalable serverless architecture</li>
                </ul>

                <Box margin={{ top: "l" }}>
                  <h3>🛠️ Technical Stack</h3>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    <Button
                      onClick={() => handleLink('https://react.dev')}
                      variant="normal"
                    >
                      🌐 React
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/amplify')}
                      variant="normal"
                    >
                      ⚛️ AWS Amplify
                    </Button>
                    <Button
                      onClick={() => handleLink('https://cloudscape.design')}
                      variant="normal"
                    >
                      🎨 Cloudscape
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/bedrock')}
                      variant="normal"
                    >
                      🤖 AWS Bedrock
                    </Button>
                  </div>
                </Box>

                <Box margin={{ top: "l" }}>
                  <h3>👋 Get Started</h3>
                  <p>Ready to begin your journey with AWS Bedrock and full-stack development? Let's dive in!</p>
                  <p>🎉 Happy Coding! 🎉</p>
                </Box>
              </TextContent>
            </Box>
          </SpaceBetween>
        </Container>
      }
    />
  );
}