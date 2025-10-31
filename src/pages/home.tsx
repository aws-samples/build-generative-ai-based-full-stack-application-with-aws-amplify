import { useState } from 'react';
import { 
  TextContent, 
  Box, 
  Header, 
  Container, 
  SpaceBetween, 
  Button,
  Alert,
  ProgressBar 
} from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// JSON 파일 import (상대 경로)
import channelData from '../../script/init/Channel.json';
import classData from '../../script/init/Class.json';
import commentData from '../../script/init/Comment.json';
import courseData from '../../script/init/Course.json';

const client = generateClient<Schema>();

export default function HomePage() {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLink = (url: string) => {
    window.open(url, '_blank');
  };

  // 간단한 테스트 함수
  const testConnection = async () => {
    console.log('=== Testing Amplify connection ===');
    try {
      // 1. Course 하나만 생성 테스트
      const testCourse = await client.models.Course.create({
        name: 'Test Course'
      });
      console.log('Test course created:', testCourse);

      // 2. 생성된 Course 조회 테스트
      const courses = await client.models.Course.list();
      console.log('All courses:', courses);

      // 3. 생성된 Course 삭제 테스트
      if (testCourse.data?.id) {
        await client.models.Course.delete({ id: testCourse.data.id });
        console.log('Test course deleted');
      }

      setMessage({ type: 'success', text: 'Connection test successful!' });
    } catch (error) {
      console.error('Connection test failed:', error);
      setMessage({ type: 'error', text: `Connection test failed: ${error}` });
    }
  };

  // DynamoDB JSON 형식을 일반 객체로 변환
  const convertDynamoDBItem = (item: any) => {
    console.log('Converting DynamoDB item:', item);
    const converted: any = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'object' && value !== null) {
        if ('S' in value) {
          converted[key] = value.S;
          console.log(`Converted ${key}: ${value.S} (String)`);
        } else if ('N' in value) {
          converted[key] = parseInt(value.N);
          console.log(`Converted ${key}: ${value.N} (Number)`);
        } else if ('BOOL' in value) {
          converted[key] = value.BOOL;
          console.log(`Converted ${key}: ${value.BOOL} (Boolean)`);
        } else {
          console.warn(`Unknown DynamoDB type for ${key}:`, value);
        }
      }
    }
    console.log('Final converted item:', converted);
    return converted;
  };

  const uploadSampleData = async () => {
    console.log('=== Starting sample data upload ===');
    setUploading(true);
    setProgress(0);
    setMessage(null);

    try {
      // 각 JSON의 아이템 개수 계산
      const courseItems = courseData.Course || [];
      const classItems = classData.Class || [];
      const commentItems = commentData.Comment || [];

      console.log(`Found items - Course: ${courseItems.length}, Class: ${classItems.length}, Comment: ${commentItems.length}`);

      // Course 업로드 및 ID 매핑 생성
      console.log('=== Starting Course upload ===');
      setProgress(10);
      const courseIdMap: Record<string, string> = {}; // 원본 ID -> 실제 ID 매핑
      
      const coursePromises = courseItems.map(async (item) => {
        const course = convertDynamoDBItem(item.PutRequest.Item);
        const result = await client.models.Course.create({ name: course.name });
        if (result.data?.id) {
          courseIdMap[course.id] = result.data.id; // "1" -> "uuid-123"
          console.log(`Course mapping: ${course.id} -> ${result.data.id}`);
        }
        return result;
      });
      await Promise.all(coursePromises);
      console.log('All courses uploaded');
      setProgress(30);

      // Class 업로드 (courseId 매핑 적용)
      console.log('=== Starting Class upload ===');
      const classPromises = classItems.map(async (item) => {
        const classItem = convertDynamoDBItem(item.PutRequest.Item);
        const mappedCourseId = courseIdMap[classItem.courseId] || classItem.courseId;
        
        console.log(`Class ${classItem.name}: courseId ${classItem.courseId} -> ${mappedCourseId}`);
        
        return client.models.Class.create({
          name: classItem.name,
          courseId: mappedCourseId, // 매핑된 실제 Course ID 사용
          description: classItem.description || undefined,
          image: classItem.image || undefined,
          class_flag: classItem.class_flag || 0,
          url: classItem.url || undefined,
          transcript: classItem.transcript || undefined,
          author: classItem.author || undefined,
        });
      });
      await Promise.all(classPromises);
      console.log('All classes uploaded');
      setProgress(60);

      // Comment 업로드 (배치로 처리)
      console.log('=== Starting Comment upload (batch processing) ===');
      const batchSize = 10; // 10개씩 배치로 처리
      const commentBatches = [];
      
      for (let i = 0; i < commentItems.length; i += batchSize) {
        commentBatches.push(commentItems.slice(i, i + batchSize));
      }

      console.log(`Processing ${commentBatches.length} batches of comments`);
      
      for (let batchIndex = 0; batchIndex < commentBatches.length; batchIndex++) {
        const batch = commentBatches[batchIndex];
        const batchPromises = batch.map(async (item) => {
          const comment = convertDynamoDBItem(item.PutRequest.Item);
          return client.models.Comment.create({
            classId: comment.classId || undefined,
            content: comment.content || undefined,
            commentVersion: comment.commentVersion || undefined,
          });
        });
        
        await Promise.all(batchPromises);
        const progress = 60 + ((batchIndex + 1) / commentBatches.length) * 40;
        setProgress(progress);
        console.log(`Batch ${batchIndex + 1}/${commentBatches.length} completed`);
      }

      console.log('=== Upload completed successfully ===');
      setMessage({ 
        type: 'success', 
        text: `Sample data upload completed with courseId mapping! (Course: ${courseItems.length}, Class: ${classItems.length}, Comment: ${commentItems.length})` 
      });
    } catch (error) {
      console.error('=== Upload failed ===', error);
      setMessage({ 
        type: 'error', 
        text: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteSampleData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all data?\n(Course, Class, Comment)\n\nThis action cannot be undone!'
    );

    if (!confirmed) return;

    console.log('=== Starting data deletion ===');
    setDeleting(true);
    setProgress(0);
    setMessage(null);

    try {
      let totalDeleted = 0;

      // Comment 삭제
      console.log('=== Starting Comment deletion ===');
      const comments = await client.models.Comment.list();
      console.log(`Found ${comments.data.length} comments to delete`);
      
      for (let i = 0; i < comments.data.length; i++) {
        const comment = comments.data[i];
        console.log(`Deleting Comment ${i + 1}/${comments.data.length}:`, comment.id);
        
        try {
          await client.models.Comment.delete({ id: comment.id });
          console.log('Comment deleted successfully:', comment.id);
          totalDeleted++;
          setProgress(33);
        } catch (error) {
          console.error('Failed to delete Comment:', comment.id, error);
        }
      }

      // Class 삭제
      console.log('=== Starting Class deletion ===');
      const classes = await client.models.Class.list();
      console.log(`Found ${classes.data.length} classes to delete`);
      
      for (let i = 0; i < classes.data.length; i++) {
        const classItem = classes.data[i];
        console.log(`Deleting Class ${i + 1}/${classes.data.length}:`, classItem.id);
        
        try {
          await client.models.Class.delete({ id: classItem.id });
          console.log('Class deleted successfully:', classItem.id);
          totalDeleted++;
          setProgress(66);
        } catch (error) {
          console.error('Failed to delete Class:', classItem.id, error);
        }
      }

      // Course 삭제
      console.log('=== Starting Course deletion ===');
      const courses = await client.models.Course.list();
      console.log(`Found ${courses.data.length} courses to delete`);
      
      for (let i = 0; i < courses.data.length; i++) {
        const course = courses.data[i];
        console.log(`Deleting Course ${i + 1}/${courses.data.length}:`, course.id);
        
        try {
          await client.models.Course.delete({ id: course.id });
          console.log('Course deleted successfully:', course.id);
          totalDeleted++;
          setProgress(100);
        } catch (error) {
          console.error('Failed to delete Course:', course.id, error);
        }
      }

      console.log('=== Deletion completed successfully ===');
      setMessage({ 
        type: 'success', 
        text: `Data deletion completed! (${totalDeleted} items deleted)` 
      });
    } catch (error) {
      console.error('=== Deletion failed ===', error);
      setMessage({ 
        type: 'error', 
        text: `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setDeleting(false);
      setProgress(0);
    }
  };

  return (
    <BaseAppLayout
      content={
        <Container>
          <SpaceBetween size="l">
            <Header
              variant="h1"
              description="Build production-ready applications faster with AWS"
            >
              Generative AI Full-Stack Workshop
            </Header>
            
            <Container>
              <SpaceBetween size="l">
                <Box>
                  <Header variant="h2">Workshop Overview</Header>
                  <TextContent>
                    <p>
                      Learn to rapidly build a full-stack Generative AI application using AWS Bedrock 
                      and pre-built UI components. This workshop demonstrates how to overcome the challenges of 
                      full-stack development by leveraging modern tools and services.
                    </p>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">What You'll Learn</Header>
                  <TextContent>
                    <ul>
                      <li>Building with Cloudscape Design System</li>
                      <li>Integrating AWS Amplify</li>
                      <li>Implementing AWS Bedrock</li>
                      <li>Creating a Digital Training Platform</li>
                    </ul>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">Key Benefits</Header>
                  <TextContent>
                    <ul>
                      <li>Streamlined development process</li>
                      <li>Production-ready components</li>
                      <li>Efficient full-stack integration</li>
                      <li>Scalable serverless architecture</li>
                    </ul>
                  </TextContent>
                </Box>

                <Box>
                  <Header variant="h3">Technical Stack</Header>
                  <SpaceBetween direction="horizontal" size="s">
                    <Button
                      onClick={() => handleLink('https://react.dev')}
                      variant="normal"
                      iconName="external"
                    >
                      React
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/amplify')}
                      variant="normal"
                      iconName="external"
                    >
                      AWS Amplify
                    </Button>
                    <Button
                      onClick={() => handleLink('https://cloudscape.design')}
                      variant="normal"
                      iconName="external"
                    >
                      Cloudscape
                    </Button>
                    <Button
                      onClick={() => handleLink('https://aws.amazon.com/bedrock')}
                      variant="normal"
                      iconName="external"
                    >
                      AWS Bedrock
                    </Button>
                  </SpaceBetween>
                </Box>

                <Box>
                  <Header variant="h3">Get Started</Header>
                  <TextContent>
                    <p>Ready to begin your journey with AWS Bedrock and full-stack development? Let's dive in!</p>
                  </TextContent>
                </Box>
              </SpaceBetween>
            </Container>

            <Container>
              <SpaceBetween size="m">
                <Header variant="h2">Sample Data Management</Header>

                {message && (
                  <Alert
                    type={message.type}
                    dismissible
                    onDismiss={() => setMessage(null)}
                  >
                    {message.text}
                  </Alert>
                )}

                {(uploading || deleting) && (
                  <ProgressBar
                    value={progress}
                    label={uploading ? "Uploading..." : "Deleting..."}
                    description={`${Math.round(progress)}% complete`}
                  />
                )}

                <SpaceBetween direction="horizontal" size="s">
                  <Button
                    variant="primary"
                    onClick={uploadSampleData}
                    disabled={uploading || deleting}
                    iconName="upload"
                  >
                    {uploading ? "Uploading..." : "Upload Sample Data"}
                  </Button>

                  <Button
                    variant="normal"
                    onClick={deleteSampleData}
                    disabled={uploading || deleting}
                    iconName="remove"
                  >
                    {deleting ? "Deleting..." : "Delete All Data"}
                  </Button>

                  <Button
                    variant="link"
                    onClick={testConnection}
                    disabled={uploading || deleting}
                    iconName="status-positive"
                  >
                    Test Connection
                  </Button>
                </SpaceBetween>

                <Alert type="info">
                  <strong>Tip:</strong> Upload sample data to get started with the workshop. 
                  You can clean up the data using the delete button when no longer needed.
                  <br />
                  <small>Data source: script/init/*.json</small>
                </Alert>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Container>
      }
    />
  );
}
