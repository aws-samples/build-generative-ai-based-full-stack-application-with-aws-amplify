import { useState } from 'react';
import {
  Box,
  Button,
  Header,
  SpaceBetween,
  Textarea,
  StatusIndicator
} from "@cloudscape-design/components";

interface BotProps {
  transcript?: string;
}

export function Bot({ transcript }: BotProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAI = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement AI assistant functionality
      // This will be connected to AWS Bedrock in the workshop
      setTimeout(() => {
        setResponse("AI assistant functionality will be implemented during the workshop using AWS Bedrock.");
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error asking AI:', error);
      setResponse("Sorry, I couldn't process your request at the moment.");
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <SpaceBetween size="m">
        <Header 
          variant="h3"
          description="Ask questions about this video content"
        >
          Ask AI Assistant
        </Header>
        
        <SpaceBetween size="s">
          <Textarea
            placeholder="Ask a question about this video content..."
            value={query}
            onChange={({ detail }) => setQuery(detail.value)}
            rows={3}
          />
          
          <Box>
            <Button
              variant="primary"
              onClick={handleAskAI}
              disabled={!query.trim() || isLoading}
              loading={isLoading}
              iconName="gen-ai"
            >
              Ask AI
            </Button>
          </Box>
        </SpaceBetween>

        {response && (
          <Box 
            padding="m"
            color="text-body-default"
          >
            <SpaceBetween size="xs">
              <StatusIndicator type="info">
                AI Response
              </StatusIndicator>
              <div style={{ 
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}>
                {response}
              </div>
            </SpaceBetween>
          </Box>
        )}
      </SpaceBetween>
    </Box>
  );
}
