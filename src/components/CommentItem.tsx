import { useState } from 'react';
import {
  Box,
  Button,
  Modal,
  SpaceBetween,
  TextContent,
  Container,
  StatusIndicator
} from "@cloudscape-design/components";
import moment from 'moment';
import { NewLineToBr } from './utils/NewLineToBr';

export const NoComment = () => (
  <Box
    padding="l"
    textAlign="center"
    color="text-body-secondary"
  >
    <SpaceBetween size="s" alignItems="center">
      <StatusIndicator type="info">
        No comments yet
      </StatusIndicator>
      <TextContent>
        <p>Be the first to share your thoughts about this class!</p>
      </TextContent>
    </SpaceBetween>
  </Box>
);

interface CommentProps {
  comment: {
    id: string;
    content: string | null;
    owner?: string;
    updatedAt: string;
  };
  deleteCommentApi: (commentId: string) => Promise<void>;
}

export const Comment = ({
  comment,
  deleteCommentApi,
}: CommentProps) => {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const deleteHandler = async () => {
    try {
      console.log('Deleting comment:', comment.id);
      await deleteCommentApi(comment.id);
      setConfirmVisible(false);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div style={{ 
      padding: '12px 0',
      borderBottom: '1px solid #eee'
    }}>
      <div style={{ 
        fontSize: '13px',
        color: '#666',
        marginBottom: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{moment(comment.updatedAt).fromNow()}</span>
        <Button 
          iconName="remove" 
          variant="icon" 
          onClick={() => setConfirmVisible(true)}
          ariaLabel="Delete"
        />
      </div>
      <div style={{ 
        fontSize: '14px',
        lineHeight: '1.4',
        wordBreak: 'break-word'
      }}>
        <NewLineToBr>{comment.content || ''}</NewLineToBr>
      </div>

      <Modal
        onDismiss={() => setConfirmVisible(false)}
        visible={confirmVisible}
        closeAriaLabel="Close modal"
        size="small"
        header="Delete Comment"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button 
                variant="link" 
                onClick={() => setConfirmVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={deleteHandler}
                loading={false}
              >
                Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <TextContent>
          <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
        </TextContent>
      </Modal>
    </div>
  );
};
