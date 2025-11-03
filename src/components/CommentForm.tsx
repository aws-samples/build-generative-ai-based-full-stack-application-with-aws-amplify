// src/components/CommentForm.tsx
import { useState } from 'react';
import {
  Box,
  Button,
  Form,
  Modal,
  SpaceBetween,
  Textarea,
  Header,
} from "@cloudscape-design/components";
import LoadingBar from "@cloudscape-design/chat-components/loading-bar";
import { NewLineToBr } from './utils/NewLineToBr';
import { useCommentSummary } from './utils/commentSummary';

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
  
  // Use comment summary hook
  const { summary, isGenerating, generateSummarization } = useCommentSummary(classId);

  const submitHandler = async (event: any) => {
    event.preventDefault();
    if (post.replace(/\s/g, '').length > 0) {
      await createCommentApi(post, classId);
      setPost("");
    } else {
      setAlertVisible(true);
    }
  };

  return (
    <form onSubmit={submitHandler}>
      <Form>
        <SpaceBetween size="l">
          {/* Summary section */}
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
              color={summary && summary !== "Generated summary will appear here." 
                ? "text-body-default" 
                : "text-body-secondary"}
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
                <NewLineToBr>
                  {summary || "Generated summary will appear here."}
                </NewLineToBr>
              </div>
            </Box>
          </SpaceBetween>

          {/* Comment input section */}
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
