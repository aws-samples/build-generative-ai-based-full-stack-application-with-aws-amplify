import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface StreamingSearchProps {
  searchQuery: string;
  classDescriptions: string;
  onStreamUpdate: (content: string) => void;
  onComplete: (finalContent: string) => void;
  onError: (error: string) => void;
}

export const StreamingSearch = ({ 
  searchQuery, 
  classDescriptions, 
  onStreamUpdate, 
  onComplete, 
  onError 
}: StreamingSearchProps) => {
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!searchQuery || isStreaming) return;

    const startStreaming = async () => {
      setIsStreaming(true);
      let accumulatedContent = '';

      try {
        // Simulate streaming by polling the API and building response progressively
        const response = await client.queries.searchClassesStream({
          searchQuery,
          classDescriptions
        });

        const fullContent = response.data?.body || '';
        
        // Simulate token-by-token streaming
        const tokens = fullContent.split(' ');
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i] + (i < tokens.length - 1 ? ' ' : '');
          accumulatedContent += token;
          
          onStreamUpdate(accumulatedContent);
          
          // Simulate streaming delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        onComplete(accumulatedContent);
        
      } catch (error) {
        console.error('Streaming error:', error);
        onError(error instanceof Error ? error.message : 'Streaming failed');
      } finally {
        setIsStreaming(false);
      }
    };

    startStreaming();
  }, [searchQuery, classDescriptions, isStreaming]);

  return null; // This is a headless component
};

export default StreamingSearch;
