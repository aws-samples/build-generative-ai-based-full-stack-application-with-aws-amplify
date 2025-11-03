// src/components/utils/commentSummary.ts
import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * Creates a prompt template for comment summarization
 */
const createSummaryPrompt = (commentsText: string): string => {
  return `📊 Summarize the following comments in a structured format:

    ${commentsText}

    Format your response as follows:

    📚 Summary:
    [Provide a concise summary of the overall sentiment and main points]

    ⭐️ Overall Score : [_/5]

    💫 Key Reason:
    [Main reason for the score]`;

};

/**
 * Sends a prompt to Bedrock and receives a response
 */
const askBedrock = async (prompt: string): Promise<string | null> => {
  try {
    const messages = JSON.stringify([
      {
        role: "user",
        content: [{ text: prompt }]
      }
    ]);
    
    const system = JSON.stringify([
      { text: "You are a helpful AI assistant that summarizes comments." }
    ]);

    const response = await client.queries.askBedrock({ 
      messages: messages,
      system: system 
    });
    
    console.log("Bedrock raw response:", response);
    
    if (!response.data?.body) {
      console.error("No body in Bedrock response");
      return null;
    }
    
    const res = JSON.parse(response.data.body);
    console.log("Parsed Bedrock response:", res);
    
    const content = res.output?.message?.content?.[0]?.text || null;
    return content;
    
  } catch (error) {
    console.error("Error in askBedrock:", error);
    throw error;
  }
};

/**
 * Custom hook that provides comment summarization functionality
 */
export const useCommentSummary = (classId: string) => {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generates a summary of comments
   */
  const generateSummarization = async () => {
    setIsGenerating(true);
    console.log("Generating summarization...");
    
    try {
      // 1. Fetch comments
      const { data: comments, errors } = await client.models.Comment.list({
        filter: { classId: { eq: classId } },
        limit: 1000
      });

      if (errors) {
        console.error('Error fetching comments:', errors);
        setSummary("Failed to fetch comments.");
        return;
      }

      // 2. Check if no comments exist
      if (!comments || comments.length === 0) {
        console.log("No comments to summarize");
        setSummary("No comments available to summarize.");
        return;
      }

      console.log(`Total comments found: ${comments.length}`);

      // 3. Combine comment texts
      const commentsText = comments
        .map(comment => comment.content)
        .filter(content => content) // Remove null/undefined
        .join("\n");

      console.log('Comments text length:', commentsText.length);

      // 4. Create prompt and call Bedrock
      const prompt = createSummaryPrompt(commentsText);
      const response = await askBedrock(prompt);
      
      if (response) {
        console.log("Summary generated successfully");
        setSummary(response);
      } else {
        setSummary("Failed to generate summary.");
      }

    } catch (error) {
      console.error("Error in generateSummarization:", error);
      setSummary("An error occurred while generating the summary.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    summary,
    isGenerating,
    generateSummarization,
  };
};
