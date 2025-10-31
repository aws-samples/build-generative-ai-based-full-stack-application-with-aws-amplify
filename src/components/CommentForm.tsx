import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Form,
  Modal,
  SpaceBetween,
  Textarea,
  Header,
} from "@cloudscape-design/components";
import LoadingBar from "@cloudscape-design/chat-components/loading-bar";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import { NewLineToBr } from './utils/NewLineToBr';

const client = generateClient<Schema>();

interface CommentFormProps {
  classId: string;
  createCommentApi: (post: string, classId: string) => Promise<void>;
}

export const CommentForm = ({
  classId,
  createCommentApi,
}: CommentFormProps) => {
  const [post, setPost] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const submitHandler = async (event: any) => {
    event.preventDefault();
    if (post.replace(/\s/g, '').length > 0) {
      await createCommentApi(post, classId);
      setPost("");
    } else {
      setAlertVisible(true);
    }
  };

  const cancelHandler = () => {
    setPost("");
  }

  const askBedrock = async (prompt: string) => {
    const response = await client.queries.askBedrock({ prompt: prompt });
    const res = JSON.parse(response.data?.body!);
    const content = res.content[0].text;
    return content || null;
  };

  const generateSummarization = async () => {
    setIsGenerating(true);
    console.log("Generating summarization...");
    
    try {
      const { data: comments, errors } = await client.models.Comment.list({
        filter: { classId: { eq: classId } },
        limit: 1000
      });

      if (errors) {
        console.error('Error fetching comments:', errors);
        return;
      }

      if (!comments || comments.length === 0) {
        console.log("No comments to summarize");
        setSummary("No comments available to summarize.");
        return;
      }

      console.log(`Total comments found: ${comments.length}`);
      console.log('All comments:', comments);

      const commentsText = comments
        .map(comment => comment.content)
        .join("\n");

      console.log('Full comments text being sent to Bedrock:', commentsText);
      console.log('Number of characters in prompt:', commentsText.length);

      const prompt = `📊 Summarize the following comments in a structured format:

      ${commentsText}

      Format your response as follows:

      📚 Summary:
      [Provide a concise summary of the positive and negative sentiment]

      ⭐️ Number of positive comment :
      ⭐️ Number of Negative comment :

      💫 Key Reason:
      [Main reason for the score]`;

      const response = await askBedrock(prompt);
      console.log("Bedrock response:", response);
      setSummary(response);

    } catch (error) {
      console.error("Error in generateSummarization:", error);
      setSummary("An error occurred while generating the summary.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={submitHandler}>
      <Form>
        <SpaceBetween size="l">
          <SpaceBetween size="s">
            <Box>
              <Button 
                formAction="none" 
                onClick={generateSummarization}
                iconName="gen-ai"
                disabled={isGenerating}
                loading={isGenerating}
              >
                Summarize Comments
              </Button>
            </Box>
            
            {isGenerating && (
              <Box>
                <SpaceBetween size="xs">
                  <Box
                    color="text-body-secondary"
                    fontSize="body-s"
                  >
                    Generating AI summary...
                  </Box>
                  <LoadingBar variant="gen-ai" />
                </SpaceBetween>
              </Box>
            )}

            <Box
              padding="m"
              color={summary && summary !== "Generated summary will appear here." ? "text-body-default" : "text-body-secondary"}
              fontSize="body-m"
            >
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  lineHeight: '1.5',
                  border: '1px solid #e9ebed',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#fafbfc'
                }}
              >
                <NewLineToBr>{summary || "Generated summary will appear here."}</NewLineToBr>
              </div>
            </Box>
          </SpaceBetween>

          <SpaceBetween size="s">
            <Header variant="h4">Add Comment</Header>
            <Textarea
              placeholder="Share your thoughts about this class..."
              onChange={({ detail }) => setPost(detail.value)}
              value={post}
              rows={Math.max(3, post.split(/\r\n|\r|\n/).length)}
            />
            
            <Box float="right">
              <Button 
                formAction="submit" 
                variant="primary"
                disabled={isGenerating || !post.trim()}
              >
                Post Comment
              </Button>
            </Box>
          </SpaceBetween>
        </SpaceBetween>

        <Modal
          onDismiss={() => setAlertVisible(false)}
          visible={alertVisible}
          closeAriaLabel="Close modal"
          size="small"
        >
          Enter a message.
        </Modal>
      </Form>
    </form>
  );
};