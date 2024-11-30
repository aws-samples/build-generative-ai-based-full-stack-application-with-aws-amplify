import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Header,
  SpaceBetween,
} from "@cloudscape-design/components";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import { CommentForm } from './CommentForm';
import { Comment, NoComment } from './CommentItem';

const client = generateClient<Schema>();

export interface Comment {
  id: string;
  classId: string | null;
  content: string | null;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentsProps {
  classId: string;
}

export function Comments({ classId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = useCallback(async () => {
    const { data: items, errors } = await client.models.Comment.list({
      filter: { classId: { eq: classId } }, 
      limit: 1000
    });
    if (errors) {
      console.error('Error fetching comments:', errors);
    } else {
      setComments(items as Comment[]);
    }
  }, [classId]);

  useEffect(() => {
    fetchComments();

    const sub = client.models.Comment.observeQuery({
      filter: { classId: { eq: classId } }
    }).subscribe({
      next: ({ items }) => {
        console.log('Received new comments:', items);
        setComments(() => {
          const newComments = [...items] as Comment[];
          return newComments.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      },
      error: (error) => {
        console.error('Subscription error:', error);
      }
    });

    return () => sub.unsubscribe();
  }, [classId]);

  const createCommentApi = useCallback(async (post: string, classId: string) => {
    const { errors, data: newComment } = await client.models.Comment.create({
      classId: classId,
      content: post,
    });
    if (!errors && newComment) {
      console.log('New comment created:', newComment);
    }
  }, []);

  const deleteCommentApi = useCallback(async (commentId: string) => {
    try {
      const { data: deletedComment, errors } = await client.models.Comment.delete({
        id: commentId
      });
      
      if (errors) {
        console.error('Error deleting comment:', errors);
      } else {
        console.log('Deleted comment:', deletedComment);
        setComments(prevComments => 
          prevComments.filter(comment => comment.id !== commentId)
        );
      }
    } catch (error) {
      console.error('Error in deleteCommentApi:', error);
    }
  }, []);

  return (
    <Container header={<Header variant='h3'>Comments</Header>}>
      <Box>
        <SpaceBetween size="xl">
          <CommentForm 
            classId={classId}
            createCommentApi={createCommentApi}
          />
          <SpaceBetween size="xs">
            {comments.length > 0 ? (
              comments
                .filter(comment => comment.classId === classId)
                .map(comment => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    deleteCommentApi={deleteCommentApi}
                  />
                ))
            ) : (
              <NoComment />
            )}
          </SpaceBetween>
        </SpaceBetween>
      </Box>
    </Container>
  );
}