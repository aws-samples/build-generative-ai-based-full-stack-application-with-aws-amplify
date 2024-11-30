import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Form,
  Grid,
  Modal,
  SpaceBetween,
  Textarea,
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
      [Provide a concise summary of the overall sentiment and main points]

      ⭐️ Overall Score : [_/5]

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
        <SpaceBetween size="m">
          <Box>
            <Button 
              formAction="none" 
              onClick={generateSummarization}
              iconName="gen-ai"
              disabled={isGenerating}
              loading={isGenerating}
            >
              Summarize
            </Button>
          </Box>
          
          {isGenerating && (
            <Container>
              <Box
                margin={{ bottom: "xs", left: "l" }}
                color="text-body-secondary"
              >
                Generating summary
              </Box>
              <LoadingBar variant="gen-ai" />
            </Container>
          )}

          <Box>
            <Box
              variant="pre"
              padding="s"
              fontSize="body-m"
              color="text-body-secondary"
            >
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              >
                <NewLineToBr>{summary || "Generated summary will appear here."}</NewLineToBr>
              </div>
            </Box>
          </Box>

          <hr style={{ width: '100%', margin: '20px 0' }} />

          <Grid disableGutters gridDefinition={[{ colspan: 10 }, { colspan: 2 }]}>
            <Textarea
              placeholder="Enter your comments here."
              onChange={({ detail }) => setPost(detail.value)}
              value={post}
              rows={post.split(/\r\n|\r|\n/).length}
            />
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button 
                  formAction="none" 
                  iconName="undo" 
                  variant="icon" 
                  onClick={cancelHandler}
                  disabled={isGenerating}
                />
                <Button 
                  formAction="submit" 
                  iconName="upload" 
                  variant="icon"
                  disabled={isGenerating}
                />
              </SpaceBetween>
            </Box>
          </Grid>
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