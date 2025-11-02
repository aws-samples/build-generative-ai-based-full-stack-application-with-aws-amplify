import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import channelData from '../../../script/init/Channel.json';
import classData from '../../../script/init/Class.json';
import commentData from '../../../script/init/Comment.json';
import courseData from '../../../script/init/Course.json';

const client = generateClient<Schema>();

export const testConnection = async () => {
  console.log('=== Testing Amplify connection ===');
  try {
    const testCourse = await client.models.Course.create({
      name: 'Test Course'
    });
    console.log('Test course created:', testCourse);

    const courses = await client.models.Course.list();
    console.log('All courses:', courses);

    if (testCourse.data?.id) {
      await client.models.Course.delete({ id: testCourse.data.id });
      console.log('Test course deleted');
    }

    return { success: true, message: 'Connection test successful!' };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { success: false, message: `Connection test failed: ${error}` };
  }
};

export const convertDynamoDBItem = (item: any) => {
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

export const uploadSampleData = async (
  setProgress: (progress: number) => void,
  setMessage: (message: { type: 'success' | 'error', text: string }) => void
) => {
  console.log('=== Starting sample data upload ===');
  setProgress(0);

  try {
    const courseItems = courseData.Course || [];
    const classItems = classData.Class || [];
    const commentItems = commentData.Comment || [];

    console.log(`Found items - Course: ${courseItems.length}, Class: ${classItems.length}, Comment: ${commentItems.length}`);

    console.log('=== Starting Course upload ===');
    setProgress(10);
    const courseIdMap: Record<string, string> = {};
    
    const coursePromises = courseItems.map(async (item) => {
      const course = convertDynamoDBItem(item.PutRequest.Item);
      const result = await client.models.Course.create({ name: course.name });
      if (result.data?.id) {
        courseIdMap[course.id] = result.data.id;
        console.log(`Course mapping: ${course.id} -> ${result.data.id}`);
      }
      return result;
    });
    await Promise.all(coursePromises);
    console.log('All courses uploaded');
    setProgress(30);

    console.log('=== Starting Class upload ===');
    const classPromises = classItems.map(async (item) => {
      const classItem = convertDynamoDBItem(item.PutRequest.Item);
      const mappedCourseId = courseIdMap[classItem.courseId] || classItem.courseId;
      
      console.log(`Class ${classItem.name}: id ${classItem.id}, courseId ${classItem.courseId} -> ${mappedCourseId}`);
      
      return client.models.Class.create({
        id: classItem.id,
        name: classItem.name,
        courseId: mappedCourseId,
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

    console.log('=== Starting Comment upload (batch processing) ===');
    const batchSize = 10;
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
  }
};

export const deleteSampleData = async (
  setProgress: (progress: number) => void,
  setMessage: (message: { type: 'success' | 'error', text: string }) => void
) => {
  console.log('=== Starting data deletion ===');
  setProgress(0);

  try {
    let totalDeleted = 0;
    let totalItems = 0;

    console.log('=== Counting all items ===');
    const comments = await client.models.Comment.list({ limit: 1000 });
    const classes = await client.models.Class.list({ limit: 1000 });
    const courses = await client.models.Course.list({ limit: 1000 });
    
    totalItems = comments.data.length + classes.data.length + courses.data.length;
    console.log(`Total items to delete: ${totalItems} (Comments: ${comments.data.length}, Classes: ${classes.data.length}, Courses: ${courses.data.length})`);

    if (totalItems === 0) {
      setMessage({ type: 'success', text: 'No data to delete. Database is already empty.' });
      return;
    }

    console.log('=== Starting Comment deletion ===');
    const batchSize = 20;
    for (let i = 0; i < comments.data.length; i += batchSize) {
      const batch = comments.data.slice(i, i + batchSize);
      console.log(`Deleting comment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(comments.data.length/batchSize)}`);
      
      const deletePromises = batch.map(async (comment) => {
        try {
          const result = await client.models.Comment.delete({ id: comment.id });
          return result.errors ? false : true;
        } catch (error) {
          console.error('Failed to delete Comment:', comment.id, error);
          return false;
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      totalDeleted += successCount;
      console.log(`Batch completed: ${successCount}/${batch.length} deleted`);
      setProgress(Math.round((totalDeleted / totalItems) * 100));
    }

    console.log('=== Starting Class deletion ===');
    for (let i = 0; i < classes.data.length; i += batchSize) {
      const batch = classes.data.slice(i, i + batchSize);
      console.log(`Deleting class batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(classes.data.length/batchSize)}`);
      
      const deletePromises = batch.map(async (classItem) => {
        try {
          const result = await client.models.Class.delete({ id: classItem.id });
          return result.errors ? false : true;
        } catch (error) {
          console.error('Failed to delete Class:', classItem.id, error);
          return false;
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      totalDeleted += successCount;
      console.log(`Batch completed: ${successCount}/${batch.length} deleted`);
      setProgress(Math.round((totalDeleted / totalItems) * 100));
    }

    console.log('=== Starting Course deletion ===');
    for (let i = 0; i < courses.data.length; i += batchSize) {
      const batch = courses.data.slice(i, i + batchSize);
      console.log(`Deleting course batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(courses.data.length/batchSize)}`);
      
      const deletePromises = batch.map(async (course) => {
        try {
          const result = await client.models.Course.delete({ id: course.id });
          return result.errors ? false : true;
        } catch (error) {
          console.error('Failed to delete Course:', course.id, error);
          return false;
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      totalDeleted += successCount;
      console.log(`Batch completed: ${successCount}/${batch.length} deleted`);
      setProgress(Math.round((totalDeleted / totalItems) * 100));
    }

    console.log('=== Deletion completed successfully ===');
    console.log(`Actually deleted: ${totalDeleted}/${totalItems} items`);
    setMessage({ 
      type: 'success', 
      text: `Data deletion completed! (${totalDeleted}/${totalItems} items deleted - Comments: ${comments.data.length}, Classes: ${classes.data.length}, Courses: ${courses.data.length})` 
    });
  } catch (error) {
    console.error('=== Deletion failed ===', error);
    setMessage({ 
      type: 'error', 
      text: `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
};
