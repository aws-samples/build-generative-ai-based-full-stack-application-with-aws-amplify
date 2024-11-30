import { useState } from 'react';
import {
  Box,
  Button,
  Modal,
  SpaceBetween,
  TextContent,
} from "@cloudscape-design/components";
import moment from 'moment';
import { NewLineToBr } from './utils/NewLineToBr';

export const NoComment = () => (
  <Box
    padding={{ bottom: "s" }}
    fontSize="heading-s"
    textAlign="center"
    color="inherit"
  >
    <b>No Contents</b>
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
    <Box
      padding="s"
    >
      <SpaceBetween direction="vertical" size="xs">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box variant="small" color="text-body-secondary">
                {moment(comment.updatedAt).fromNow()}
              </Box>
              <Button 
                iconName="remove" 
                variant="icon" 
                onClick={() => setConfirmVisible(true)}
              />
            </div>
          </TextContent>
        </div>
        
        <Box>
          <NewLineToBr>{comment.content || ''}</NewLineToBr>
        </Box>
      </SpaceBetween>

      <Modal
        onDismiss={() => setConfirmVisible(false)}
        visible={confirmVisible}
        closeAriaLabel="Close modal"
        size="small"
        header="Delete Confirmation"
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
        Are you sure to delete the message?
      </Modal>
    </Box>
  );
};